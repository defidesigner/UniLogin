import {providers, Contract} from 'ethers';
import {GnosisSafeInterface, signStringMessage, calculateGnosisStringHash, SENTINEL_OWNERS} from '@universal-login/contracts';
import {IWalletContractServiceStrategy} from './WalletContractService';
import {ensureNotFalsy} from '@universal-login/commons';
import {WalletNotFound} from '../../core/utils/errors';

export class GnosisSafeService implements IWalletContractServiceStrategy {
  private contract?: Contract;

  constructor(private provider: providers.Provider) {
  }

  getContractInstance(walletAddress: string) {
    this.contract = this.contract || new Contract(walletAddress, GnosisSafeInterface, this.provider);
    return this.contract;
  }

  async lastNonce(walletAddress: string) {
    return parseInt(await this.getContractInstance(walletAddress).nonce(), 10);
  }

  keyExist(walletAddress: string, key: string) {
    return this.getContractInstance(walletAddress).isOwner(key);
  }

  requiredSignatures(walletAddress: string) {
    return this.getContractInstance(walletAddress).getThreshold();
  }

  signMessage(privateKey: string, message: Uint8Array | string, walletAddress?: string) {
    ensureNotFalsy(walletAddress, WalletNotFound);
    ensureNotFalsy(typeof message === 'string', TypeError, 'Invalid message type. Expected type: string.');
    const messageHash = calculateGnosisStringHash(message as string, walletAddress);
    return signStringMessage(messageHash, privateKey);
  }

  getOwners(walletAddress: string): Promise<string[]> {
    return this.getContractInstance(walletAddress).getOwners();
  }

  getPreviousOwner(owners: string[], currentOwner: string) {
    const currentOwnerIndex = owners.findIndex(owner => currentOwner === owner);
    if (currentOwnerIndex === 0) {
      return SENTINEL_OWNERS;
    } else {
      return owners[currentOwnerIndex - 1];
    }
  }

  async encodeFunction(method: string, args?: any[], walletAddress?: string) {
    switch (method) {
      case 'addKey':
        ensureNotFalsy(walletAddress, WalletNotFound);
        ensureNotFalsy(args, TypeError, 'Public key not provided.');
        return GnosisSafeInterface.functions.addOwnerWithThreshold
          .encode([...args, (await this.requiredSignatures(walletAddress)).add(1)]);
      case 'removeKey':
        ensureNotFalsy(walletAddress, WalletNotFound);
        ensureNotFalsy(args, TypeError, 'Public key not provided.');
        const owners = await this.getOwners(walletAddress);
        return GnosisSafeInterface.functions.removeOwner
          .encode([this.getPreviousOwner(owners, args[0]), args[0], (await this.requiredSignatures(walletAddress)).sub(1)]);
      case 'setRequiredSignatures':
        return GnosisSafeInterface.functions.changeThreshold.encode(args);
      default:
        throw TypeError(`Invalid method: ${method}`);
    };
  }
};
