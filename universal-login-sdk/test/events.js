import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import EthereumIdentitySDK from 'universal-login-sdk/lib/sdk';
import {RelayerUnderTest} from 'universal-login-relayer';
import {createMockProvider, getWallets, solidity, deployContract} from 'ethereum-waffle';
import {utils} from 'ethers';
import sinon from 'sinon';
import DEFAULT_PAYMENT_OPTIONS from '../lib/config';
import MockToken from '../../universal-login-contracts/build/MockToken';

chai.use(solidity);
chai.use(sinonChai);

describe('SDK - events', async () => {
  let provider;
  let relayer;
  let sdk;
  let identityAddress;
  let wallet;
  let privateKey;
  let sponsor;
  let token;

  before(async () => {
    provider = createMockProvider();
    [wallet, sponsor] = await getWallets(provider);
    relayer = await RelayerUnderTest.createPreconfigured(provider);
    await relayer.start();
    ({provider} = relayer);
    sdk = new EthereumIdentitySDK(relayer.url(), provider);
    [privateKey, identityAddress] = await sdk.create('alex.mylogin.eth');
    sponsor.send(identityAddress, 10000);
    token = await deployContract(wallet, MockToken, []);
    await token.transfer(identityAddress, utils.parseEther('20'));
  });


  it('create, request connection, addKey roundtrip', async () => {
    const connectionCallback = sinon.spy();
    const keyCallback = sinon.spy();

    sdk.start();

    await sdk.subscribe('AuthorisationsChanged', identityAddress, connectionCallback);
    await sdk.subscribe('KeyAdded', identityAddress, keyCallback);

    await sdk.connect(identityAddress);
    const addKeyPaymentOption = {...DEFAULT_PAYMENT_OPTIONS, gasToken: token.address};
    await sdk.addKey(identityAddress, wallet.address, privateKey, addKeyPaymentOption);
    await sdk.finalizeAndStop();
    expect(keyCallback).to.have.been.calledWith({address: wallet.address, keyType: 1, purpose: 1});
    expect(connectionCallback).to.have.been.called;
  });

  after(async () => {
    await relayer.stop();
  });
});
