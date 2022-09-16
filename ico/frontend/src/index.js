import { ethers } from "ethers"
import IcoJSON from '../../artifacts/contracts/ICO.sol/ICO.json';
import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const icoAddr = '0x899453F7437478BE0bc654364573C24591956a2d';
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = '0x0cC86FC5B89BC3E3A55828595D133c5965c1ee57';
const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);

run();

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

async function run() {
  await connectToMetamask();

  const { phaseName, unclaimSpcBalance } = await refreshData();
  enabledClaimToken(phaseName, unclaimSpcBalance);

  ico_spc_buy.addEventListener('submit', async e => {
    e.preventDefault()
    const form = e.target
    const eth = ethers.utils.parseEther(form.eth.value)
    console.log("Buying", eth, "eth")
  
    await connectToMetamask();
    try {
      const txReceipt = await icoContract.connect(signer).contribute({ value: eth });
      await txReceipt.wait();
    } catch(err) {
      setTimeout(() => {
        alert(errorMsgs[err.reason]);
      }, 1000);
    }

    await refreshData();
  })

  ico_spc_claim.addEventListener('submit', async e => {
    e.preventDefault()  
    await connectToMetamask()
    
    const txReceipt = await icoContract.connect(signer).claimToken();
    await txReceipt.wait();
  })

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