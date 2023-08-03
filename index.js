import { abi, contractAddress } from "./constants.js";
import { ethers } from "./dist/ethers.js";

let provider;
let signer;
let contract;

async function afterConnected() {
  //UPDATES
  setInterval(await updateBalance(), 100);
  setInterval(await updateTicketsOwned(), 100);

  //ENABLE BUTTONS
  await disableButtons(false);
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
    try {
      connectMsg.innerHTML =
        "No metamask found! Please install the extension and try again!";
      connectButton.innerHTML = "Reconnect";
    } catch (error) {
      console.log(error);
      connectMsg.innerHTML = "Connection failed!";
    }
  }
}

const ticketForm = document.getElementById("ticketForm");
const buyTicketButton = document.getElementById("buyTicketButton");
const buyStatus = document.getElementById("buyStatus");
buyTicketButton.onclick = buyTicket;

async function buyTicket() {
  try {
    disableButtons(true);
    let value = ticketForm.value * 0.2;
    buyStatus.innerHTML = "Buying tickets...";
    await contract.buyTicket({
      value: await ethers.parseEther(value.toString()),
    });
    buyStatus.innerHTML = "Tickets bought successfully!";
    disableButtons(false);
  } catch (error) {
    console.log(error);
    buyStatus.innerHTML = "Purchase failed!";
    disableButtons(false);
  }
}

const balanceDisplay = document.getElementById("balanceDisplay");

async function updateBalance() {
  balanceDisplay.innerHTML = `Possible winnings: ${await contract.getBalance()} ETH`;
}

const ticketsOwnedDisplay = document.getElementById("ticketsOwnedDisplay");

async function updateTicketsOwned() {
  ticketsOwnedDisplay.innerHTML = `Tickets owned: ${await contract.getTicketsOwned(
    signer.address
  )}`;
}

async function disableButtons(bool) {
  buyTicketButton.disabled = bool;
  connectButton.disabled = bool;
}

async function unlockOwnerCommands() {}
