import { abi, contractAddress } from "./constants.js";
import { ethers } from "./dist/ethers.js";

let provider;
let signer;
let contract;

async function afterConnected() {
  //UPDATES
  update();

  //ENABLE BUTTONS
  await disableButtons(false);

  //INITIALIZATIONS
  changeOwnerStatus.innerHTML = `Current owner: ${await contract.owner()}`;
  if ((await contract.owner()) == signer.address) {
    unlockOwnerCommands();
  }
}

const connectButton = document.getElementById("connectButton");
const connectMsg = document.getElementById("connectMsg");
connectButton.onclick = connect;

async function connect() {
  if (typeof window.ethereum != null) {
    try {
      connectButton.disabled = true;
      connectButton.innerHTML = "Connecting...";

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, abi, signer);

      connectButton.disabled = false;
      connectButton.innerHTML = "Reconnect";
      connectMsg.innerHTML = `Successfully connected to: ${signer.address}`;
    } catch (error) {
      console.log(error);
      connectMsg.innerHTML = "Connection failed!";
    }

    afterConnected();
  } else {
    connectMsg.innerHTML =
      "No metamask found! Please install the extension and try again!";
    connectButton.innerHTML = "Reconnect";
  }
}

const ticketForm = document.getElementById("ticketForm");
const buyTicketButton = document.getElementById("buyTicketButton");
const buyStatus = document.getElementById("buyStatus");
buyTicketButton.onclick = buyTicket;

async function buyTicket() {
  try {
    disableButtons(true);

    let value = (ticketForm.value * 0.02).toString();
    buyStatus.innerHTML = "Buying tickets...";
    await (
      await contract.buyTicket.send({
        value: await ethers.parseEther(value),
      })
    ).wait();
    buyStatus.innerHTML = "Tickets bought successfully!";
    await update();

    disableButtons(false);
  } catch (error) {
    console.log(error);
    buyStatus.innerHTML = "Purchase failed!";
    disableButtons(false);
  }
}

const withdrawButton = document.getElementById("withdrawButton");
const ownerCommandStatus = document.getElementById("ownerCommandStatus");
withdrawButton.onclick = withdraw;

async function withdraw() {
  try {
    disableButtons(true);

    ownerCommandStatus.innerHTML = "Withdrawing...";
    await (await contract.withdrawEth.send()).wait();
    ownerCommandStatus.innerHTML = "Withdrawed all ethereum successfully!";
    await update();

    disableButtons(false);
  } catch (error) {
    console.log(error);
    ownerCommandStatus.innerHTML = "Withdraw failed!";
    disableButtons(false);
  }
}

const endLotteryButton = document.getElementById("endLotteryButton");
const winnerDisplay = document.getElementById("winnerDisplay");
endLotteryButton.onclick = endLottery;

async function endLottery() {
  try {
    disableButtons(true);

    ownerCommandStatus.innerHTML = "Ending lottery...";
    await (await contract.endLottery.send()).wait();
    console.log("Waiting for chainlink VRF...");
    await listenForLotteryEnd();
    ownerCommandStatus.innerHTML = "Ended lottery successfully!";
    await update();

    disableButtons(false);
  } catch (error) {
    console.log(error);
    ownerCommandStatus.innerHTML = "Lottery termination failed!";
    disableButtons(false);
  }
}

const endLotteryDurationButton = document.getElementById(
  "endLotteryDurationButton"
);
const endLotteryDurationForm = document.getElementById(
  "endLotteryDurationForm"
);
const endLotteryDurationStatus = document.getElementById(
  "endLotteryDurationStatus"
);
endLotteryDurationButton.onclick = endLotteryDuration;

async function endLotteryDuration() {
  try {
    disableButtons(true);

    endLotteryDurationStatus.innerHTML = `Lottery requested to last ${endLotteryDurationForm.value} seconds...`;
    await (
      await contract.endLotteryIn.send(endLotteryDurationForm.value)
    ).wait();
    endLotteryDurationStatus.innerHTML = `Lottery set to last ${endLotteryDurationForm.value} seconds.`;

    disableButtons(false);
  } catch (error) {
    console.log(error);
    endLotteryDurationStatus.innerHTML = "Lottery termination failed!";
    disableButtons(false);
  }
}

const changeOwnerButton = document.getElementById("changeOwnerButton");
const changeOwnerForm = document.getElementById("changeOwnerForm");
const changeOwnerStatus = document.getElementById("changeOwnerStatus");
changeOwnerButton.onclick = changeOwner;

async function changeOwner() {
  try {
    disableButtons(true);

    changeOwnerStatus.innerHTML = "Changing owner...";
    await (await contract.changeOwner.send(changeOwnerForm.value)).wait();
    changeOwnerStatus.innerHTML = `Successfully changed owner to: ${await contract.owner()}`;

    disableButtons(false);
  } catch (error) {
    console.log(error);
    changeOwnerStatus.innerHTML = "Owner change failed!";
    disableButtons(false);
  }
}

const balanceDisplay = document.getElementById("balanceDisplay");

async function updateTimeLeft() {
  timeLeftDisplay.innerHTML = `Time left in lottery: ${await contract.getTimeLeft()} seconds`;
}

async function updateBalance() {
  let balance = await ethers.formatEther(await contract.getBalance());

  balanceDisplay.innerHTML = `Possible winnings: ${balance} ETH`;
}

const ticketsOwnedDisplay = document.getElementById("ticketsOwnedDisplay");

async function updateTicketsOwned() {
  ticketsOwnedDisplay.innerHTML = `Tickets owned: ${await contract.getTicketsOwned(
    signer.address
  )}`;
}

const totalTicketsDisplay = document.getElementById("totalTicketsDisplay");

async function updateTotalTickets() {
  totalTicketsDisplay.innerHTML = `Total tickets in lottery: ${await contract.getTotalTickets()}<br /><br />`;
}

const timeLeftDisplay = document.getElementById("timeLeftDisplay");

async function disableButtons(bool) {
  buyTicketButton.disabled = bool;
  connectButton.disabled = bool;

  if ((await contract.owner()) == signer.address) {
    withdrawButton.disabled = bool;
    endLotteryButton.disabled = bool;
    changeOwnerButton.disabled = bool;
    endLotteryDurationButton.disabled = bool;
  } else {
    withdrawButton.disabled = true;
    endLotteryButton.disabled = true;
    changeOwnerButton.disabled = true;
    endLotteryDurationButton.disabled = true;
  }
}

async function unlockOwnerCommands() {
  withdrawButton.disabled = false;
  endLotteryButton.disabled = false;
  changeOwnerButton.disabled = false;
}

let prevLotteryEnabled;
let lotteryEnabled;
let lock;

async function update() {
  if (contract != null) {
    updateBalance();
    updateTicketsOwned();
    updateTotalTickets();

    lotteryEnabled = await contract.lotteryEnabled();

    if (prevLotteryEnabled == false && lotteryEnabled == true) {
      buyTicketButton.disabled = false;
    } else if (lotteryEnabled == true) {
      updateTimeLeft();
    } else {
      buyTicketButton.disabled = true;
    }

    if (prevLotteryEnabled == true && lotteryEnabled == false && !lock) {
      console.log("Listening for lottery...");
      lock = true;
      await listenForLotteryEnd();
      lock = false;
    }

    prevLotteryEnabled = lotteryEnabled;

    console.log("Update!");
  }
}

function listenForLotteryEnd() {
  return new Promise((resolve, reject) => {
    contract.once("lotteryEnd", (winner, amount) => {
      console.log("Event heard!");
      let trueAmount = ethers.formatEther(amount);
      winnerDisplay.innerHTML = `${winner} just won ${trueAmount} ETH!`;
      resolve();
    });
  });
}

function alwaysListenForLotteryEnd() {
  return new Promise((resolve, reject) => {
    contract.on("lotteryEnd", (winner, amount) => {
      console.log("Event heard!");
      let trueAmount = ethers.formatEther(amount);
      winnerDisplay.innerHTML = `${winner} just won ${trueAmount} ETH!`;
      resolve();
    });
  });
}

//CONSTANT UPDATE
setInterval(update, 1000);
