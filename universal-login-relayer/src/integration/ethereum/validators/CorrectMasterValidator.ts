import {utils, Contract} from 'ethers';
import {Provider} from 'ethers/providers';
import {beta2} from '@universal-login/contracts';
import {ContractWhiteList, SignedMessage, ensure, IMessageValidator} from '@universal-login/commons';
import {InvalidMaster} from '../../../core/utils/errors';

export default class CorrectMasterValidator implements IMessageValidator {
  constructor(private provider: Provider, private contractWhiteList: ContractWhiteList) {}

  async validate(signedMessage: SignedMessage) {
    const walletProxy = new Contract(signedMessage.from, beta2.WalletProxy.interface, this.provider);
    const master = await walletProxy.implementation();

    const masterByteCode = await this.provider.getCode(master);
    const masterContractHash = utils.keccak256(masterByteCode);

    ensure(
      this.contractWhiteList.wallet.includes(masterContractHash),
      InvalidMaster,
      master,
      masterContractHash,
      this.contractWhiteList.wallet);
  }
}