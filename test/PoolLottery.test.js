const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const { interface, bytecode } = require('../compile')


const provider = ganache.provider();
const web3 = new Web3(provider);

let accounts = [];
let entryFee = '';
let manager = '';
let poolLottery = {};


beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  manager = accounts[0];
  entryFee = web3.utils.toWei('0.01', 'ether');

  poolLottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: '0x' + bytecode })
    .send({ from: manager, gas: 1000000 });
});


describe('PoolLottey Contract', () => {
  it('deploys a contract', () => {
    assert.ok(poolLottery.options.address);
  });

  
  it('stores creator as manager', async () => {
    const contractManager = await poolLottery.methods.manager().call({
      from: manager
    });
    assert.equal(manager, contractManager);
  });


  it('starts with a zero lastWinner address', async () => {
    const lastWinner = await poolLottery.methods.lastWinner().call({
      from: manager
    });
    assert.equal('0', web3.utils.hexToNumberString(lastWinner));
  });


  it('stores updated lastWinner after pickWinner', async () => {
    const initWinner = await poolLottery.methods.lastWinner().call({
      from: manager
    });

    await poolLottery.methods.joinLottery().send({
      from: manager,
      value: entryFee
    });
    await poolLottery.methods.pickWinner().send({
      from: manager
    });

    const lastWinner = await poolLottery.methods.lastWinner().call({
      from: manager
    });

    assert.equal('0', web3.utils.hexToNumberString(initWinner));
    assert.equal(manager, lastWinner);
  });


  it('receives data from getPlayers', async () => {
    const players = await poolLottery.methods.getPlayers();
    assert.equal(null, players[0]);
  });

  
  it('allows first account to joinLottery', async () => {
    await poolLottery.methods.joinLottery().send({
      from: manager,
      value: entryFee
    });

    const players = await poolLottery.methods.getPlayers().call({
      from: manager
    });

    assert.equal(manager, players[0]);
    assert.equal(1, players.length);
  });


  it('allows multiple accounts to joinLottery', async () => {
    const nAccounts = 3;

    for (let i = 0; i < nAccounts; i++) {
      await poolLottery.methods.joinLottery().send({
        from: accounts[i],
        value: entryFee
      });
    }

    const players = await poolLottery.methods.getPlayers().call({
      from: manager
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[nAccounts - 1], players[nAccounts - 1]);
    assert.equal(nAccounts, players.length);
  });

  
  it('requires specific amount of ether to joinLottery', async () => {
    lowVal = web3.utils.toWei('0.009', 'ether');
    highVal = web3.utils.toWei('0.11', 'ether');

    try {
      await poolLottery.methods.joinLottery().send({
        from: manager,
        value: lowVal
      });
      assert(false);
    } catch (err) {
      assert(err);
    }

    try {
      await poolLottery.methods.joinLottery().send({
        from: manager,
        value: highVal
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });


  it('only manager can call pickWinner', async () => {
    try {
      await poolLottery.methods.pickWinner().send({
        from: accounts[1]
      });
      assert(false);
    } catch (err) {
      assert(err);
    }

    try {
      await poolLottery.methods.joinLottery().send({
        from: manager,
        value: entryFee
      });
      await poolLottery.methods.pickWinner().send({
        from: manager
      });
      assert(true);
    } catch (err) {
      assert(false);
    }
  });


  it('sends money to the winner after pickWinner', async () => {
    const assumedGas = web3.utils.toWei('0.001', 'ether');

    await poolLottery.methods.joinLottery().send({
      from: manager,
      value: entryFee
    });

    const initialBalance = await web3.eth.getBalance(manager);

    await poolLottery.methods.pickWinner().send({
      from: manager
    });

    const finalBalance = await web3.eth.getBalance(manager);

    assert((finalBalance - initialBalance) > (+entryFee - assumedGas));
  });

  it('clears all players after pickWinner', async () => {
    await poolLottery.methods.joinLottery().send({
      from: manager,
      value: entryFee
    });

    const roundPlayers = await poolLottery.methods.getPlayers().call({
      from: manager
    });
    const nRoundPlayers = roundPlayers.length;

    await poolLottery.methods.pickWinner().send({
      from: manager
    });

    const postPlayers = await poolLottery.methods.getPlayers().call({
      from: manager
    });
    const nPostPlayers = postPlayers.length;

    assert.equal(1, nRoundPlayers);
    assert.equal(0, nPostPlayers);
  });


  it('has empty account balance after pickWinner', async () => {
    await poolLottery.methods.joinLottery().send({
      from: manager,
      value: entryFee
    });
    await poolLottery.methods.pickWinner().send({
      from: manager
    });
    
    const balance = await web3.eth.getBalance(poolLottery.options.address)

    assert.equal(0, balance);
  });
});
