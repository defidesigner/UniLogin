import {SignedMessage} from '@universal-login/commons';

export interface IMessageQueueStore {
  add: (message: SignedMessage) => Promise<string>;
  get: (id: string) => Promise<MessageEntity | undefined>;
  getNext: () => Promise<MessageEntity | undefined>;
  markAsSuccess: (id: string, transactionHash: string) => Promise<void>;
  markAsError: (id: string, error: string) => Promise<void>;
}

export interface MessageEntity {
  id: string;
  hash: string | undefined;
  error: string | undefined;
  message: SignedMessage;
}

export default IMessageQueueStore;