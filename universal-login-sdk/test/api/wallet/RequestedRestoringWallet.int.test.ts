import {expect} from 'chai';
import sinon from 'sinon';
import {MockProvider} from 'ethereum-waffle';
import {TEST_ENCRYPTED_WALLET_JSON, StoredEncryptedWallet} from '@unilogin/commons';
import {RelayerUnderTest} from '@unilogin/relayer';
import UniLoginSdk from '../../../src';
import {setupSdk} from '../../helpers';
import {RequestedRestoringWallet} from '../../../src/api/wallet/RequestedRestoringWallet';

describe('INT: RequestedRestoringWallet', () => {
  let sdk: UniLoginSdk;
  let relayer: RelayerUnderTest;
  let requestedWallet: RequestedRestoringWallet;
  const email = 'encryptedWallet@email.com';
  const ensName = 'bob.unilogin.eth';
  const encryptedWallet: StoredEncryptedWallet = {
    walletJSON: TEST_ENCRYPTED_WALLET_JSON,
    email,
    ensName,
  };

  beforeEach(async () => {
    const [wallet] = new MockProvider().getWallets();
    ({relayer, sdk} = await setupSdk(wallet));
  });

  for (const ensNameOrEmail of [ensName, email]) {
    describe(`ensNameOrEmail eq ${ensNameOrEmail}`, () => {
      beforeEach(async () => {
        requestedWallet = new RequestedRestoringWallet(sdk, ensNameOrEmail);
      });

      it('asSerializableRequestedRestoringWallet', () => {
        expect(requestedWallet.asSerializableRequestedRestoringWallet).deep.eq({ensNameOrEmail});
      });

      it('roundtrip', async () => {
        const sendConfirmationMailSpy = sinon.spy((relayer as any).emailService, 'sendConfirmationMail');
        (relayer as any).encryptedWalletsStore.get = sinon.stub().resolves(encryptedWallet);
        const requestEmailConfirmationResult = await requestedWallet.requestEmailConfirmation();
        expect(requestEmailConfirmationResult).deep.eq({email});
        const [, code] = sendConfirmationMailSpy.firstCall.args;
        expect(code).length(6);
      });
    });
  }

  afterEach(async () => {
    await relayer.stop();
  });
});