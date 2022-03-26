import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  SequenceType,
  sendTransactions,
  sendTransactionWithRetry,
  WalletSigner,
} from '@oyster/common';
import { getOperatingConfig } from '@oyster/common';
import { setFrackHouse } from '@oyster/common/dist/lib/models/frantik/setFrackHouse';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// TODO if this becomes very slow move to batching txns like we do with settle.ts
// but given how little this should be used keep it simple
export async function saveFrackAdmin(
  connection: Connection,
  wallet: WalletSigner,
  isPublic: boolean,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const operatingConfig = await getOperatingConfig();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  const storeSigners: Keypair[] = [];
  const storeInstructions: TransactionInstruction[] = [];

  await setFrackHouse(
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    operatingConfig,
    storeInstructions,
    isPublic,
  );
  signers.push(storeSigners);
  instructions.push(storeInstructions);

  instructions.length === 1
    ? await sendTransactionWithRetry(
        connection,
        wallet,
        instructions[0],
        signers[0],
        'single',
      )
    : await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'single',
      );
}
