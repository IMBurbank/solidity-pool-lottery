require('dotenv').config()

const fs = require('fs');
const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const { interface, bytecode } = require('./compile');

const provider = new HDWalletProvider(
  process.env.ACCT_MN,
  process.env.RINKEBY_URL
);
const web3 = new Web3(provider);
const logFile = './deploy-log.txt';
const N = '\n';


const deploy = async (accountNumber = 0) => {
  const accounts = await web3.eth.getAccounts();
  const deployAccount = accounts[accountNumber];
  const data = '0x' + bytecode;
  const gas = 1000000;
  const gasPrice = web3.utils.toWei('2', 'gwei');

  console.log('Attempting to deploy from account: ', deployAccount);

  const result = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data })
    .send({ gas, gasPrice , from: deployAccount });
  
  const logDeploy = () => {
    return (
      `Contract address: ${result.options.address}${N
      }Interface: ${interface}${N
      }`
    );
  }

  fs.appendFile(logFile, logDeploy(), err => {
    if (err) throw err;
    console.log('Write to log success.', logDeploy());
  });
};
deploy();
