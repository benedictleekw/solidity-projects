import { ethers } from "ethers"
import IcoJSON from '../../artifacts/contracts/ICO.sol/ICO.json';
import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';
import RouterJSON from '../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json'


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const icoAddr = '0x820996dDAB9c62efEA2368F1d4D7aB93949D6289';
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = '0x52cDa0917224C007C319433fa95681B4413c226a';
const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);

const routerAddr = '0xCCB8A8A96f61082152213cea639d49592Da7Eeba'
const spaceRouterContract = new ethers.Contract(routerAddr, RouterJSON.abi, provider);

const phases = {
  0: {
    name: "Seed Phase",
    phaseMax: 15000,
    individualMax: 1500
  },
  1: {
    name: "General Phase",
    phaseMax: 30000,
    individualMax: 1000
  },
  2: {
    name: "Open Phase",
    phaseMax: 30000,
    individualMax: "no limit"
  }
};

const errorMsgs = {
  "execution reverted: ICO: ico state is paused": "The contributions to SPC is currently paused.",
  "execution reverted: ICO: msg.sender is not in the allowlist": "You are not on whitelist, please try again during General Phase.",
  "execution reverted: ICO: Seed phase individual contribution limit exceeded": "You have exceed the individual contribution limit of 1500 ETH",
  "execution reverted: ICO: General phase individual contribution limit exceeded": "You have exceed the individual contribution limit of 1000 ETH",
  "execution reverted: ICO: fund goal has reached": "Please reduce the contribution amount or the ICO funding goal has been reached",
}

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}

//
// ICO
//
connectToMetamask();
run();
async function run() {
  const { phaseName, unclaimSpcBalance } = await refreshData();
  enabledClaimToken(phaseName, unclaimSpcBalance);
}

ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);

  await connectToMetamask();
  try {
    const txReceipt = await icoContract.connect(signer).contribute({ value: eth });
    await txReceipt.wait();
  } catch(err) {
    setTimeout(() => {
      alert(errorMsgs[err.error.message]);
    }, 500);
  }

  await refreshData();
})

ico_spc_claim.addEventListener('submit', async e => {
  e.preventDefault()  
  await connectToMetamask()
  
  const txReceipt = await icoContract.connect(signer).claimToken();
  await txReceipt.wait();
})

async function refreshData() {
  const unclaimSpcBalance = ethers.utils.formatEther(await icoContract.unclaimedContribution(signer.getAddress()));
  const fundsRaised = ethers.utils.formatEther(await icoContract.fundsRaised());
  const currentPhase = await icoContract.phase();
  const phaseName = phases[currentPhase].name;
  const individualMax = phases[currentPhase].individualMax;

  ico_spc_fund_raised.innerText = fundsRaised;
  ico_spc_phase.innerText = phaseName;
  ico_spc_phase_max.innerText = phases[currentPhase].phaseMax;
  ico_spc_individual_max.innerText = individualMax;
  ico_eth_contributed.innerText = calculateEthContribute(unclaimSpcBalance, );
  ico_spc_left.innerText = calculateSPCLeft(individualMax, unclaimSpcBalance, fundsRaised);
  return { phaseName, unclaimSpcBalance };
}

function calculateEthContribute(unclaimSpcBalance, ) {
  const claimedEthBalance = spaceCoinContract.connect(signer).balanceOf(signer.getAddress()) / 5 || 0;
  return unclaimSpcBalance + claimedEthBalance;
}

function calculateSPCLeft(individualLimit, unclaimSpcBalance, fundsRaised) {
  if (individualLimit == "no limit") {
    return individualLimit = 30000 - fundsRaised;
  }
  return individualLimit - unclaimSpcBalance;
}

function enabledClaimToken(phaseName, unclaimSpcBalance) {
  if (phaseName == "Open Phase" && unclaimSpcBalance > 0) {
    ico_spc_claim_btn.disabled = false;
  }
}


//
// LP
//
let currentSpcToEthPrice = 5

provider.on("block", n => {
  console.log("New block", n)
  // TODO: Update currentSpcToEthPrice
})

lp_deposit.eth.addEventListener('input', e => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice
})

lp_deposit.spc.addEventListener('input', e => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice
})

lp_deposit.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  const spc = ethers.utils.parseEther(form.spc.value)
  console.log("Depositing", eth, "eth and", spc, "spc")

  await connectToMetamask()
  try {
    const approvalTx = await spaceCoinContract.connect(signer).approve(spaceRouterContract.getAddress(), spc, {
      from: signer.getAddress()
    });
    await approvalTx.wait();
    const txReceipt = await spaceRouterContract.connect(signer).addLiquidity(spc, signer.getAddress(), { value: eth });
    await txReceipt.wait();
  } catch(err) {
    console.log(err);
    setTimeout(() => {
      alert(errorMsgs[err.error.message]);
    }, 500);
  }
})

lp_withdraw.addEventListener('submit', async e => {
  e.preventDefault()
  console.log("Withdrawing 100% of LP")

  await connectToMetamask()

  const liquidityOwned = spaceRouterContract.connect(signer).balanceOf(signer.getAddress());
  try {
    const txReceipt = await spaceRouterContract.connect(signer).removeLiquidity(liquidityOwned, signer.getAddress());
    await txReceipt.wait();
  } catch(err) {
    setTimeout(() => {
      alert(errorMsgs[err.error.message]);
    }, 500);
  }
})

// //
// // Swap
// //
let swapIn = { type: 'eth', value: 0 }
let swapOut = { type: 'spc', value: 0 }
switcher.addEventListener('click', () => {
  [swapIn, swapOut] = [swapOut, swapIn]
  swap_in_label.innerText = swapIn.type.toUpperCase()
  swap.amount_in.value = swapIn.value
  updateSwapOutLabel()
})

swap.amount_in.addEventListener('input', updateSwapOutLabel)

function updateSwapOutLabel() {
  swapOut.value = swapIn.type === 'eth'
    ? +swap.amount_in.value * currentSpcToEthPrice
    : +swap.amount_in.value / currentSpcToEthPrice

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`
}

swap.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const amountIn = ethers.utils.parseEther(form.amount_in.value)

  console.log("Swapping", amountIn, swapIn.type, "for", swapOut.type)

  await connectToMetamask()
  try {
    let txReceipt;
    if (swapIn === "eth") {
      txReceipt = await spaceRouterContract.connect(signer).swapExactETHForToken(swapOut.value, signer.getAddress(), { value: eth });
    } else {
      txReceipt = await spaceRouterContract.connect(signer).swapExactTokensForETH(swapIn.value, swapOut.value, signer.getAddress());
    }
    
    await txReceipt.wait();
  } catch(err) {
    setTimeout(() => {
      alert(errorMsgs[err.error.message]);
    }, 500);
  }
})
