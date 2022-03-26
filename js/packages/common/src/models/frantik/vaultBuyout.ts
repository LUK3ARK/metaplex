import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { useMeta } from '../..';

import {
  FullRightsTokenTransferArgs,
  FRACTION_SCHEMA,
  getFractionSafetyDepositConfig,
} from '.';
import { VAULT_PREFIX } from '../../actions';
import {
  findProgramAddress,
  programIds,
  StringPublicKey,
  toPublicKey,
} from '../../utils';

export async function vaultBuyout(
  vault: StringPublicKey,
  safetyDepositTokenStore: StringPublicKey,
  destination: StringPublicKey,
  safetyDeposit: StringPublicKey,
  fractionMint: StringPublicKey,
  priceMint: StringPublicKey,
  vaultAuthority: StringPublicKey,
  fractionManager: StringPublicKey,
  instructions: TransactionInstruction[],
  masterMetadata: StringPublicKey,
  newAuthority: StringPublicKey,
  burnAuthority: StringPublicKey,
  redeemTreasury: StringPublicKey,
  fractionTreasury: StringPublicKey,
  externalPriceAccount: StringPublicKey,
  outstandingShareTokenAccount: StringPublicKey,
  payer: StringPublicKey,
  creatorAccounts: StringPublicKey[],
  payerTokenAccount?: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();
  const frackHouse = PROGRAM_IDS.frack_house;
  if (!frackHouse) {
    throw new Error('Frack House not initialized');
  }

  const { operatingConfig } = useMeta();
  // todo - eventually change this error for just manually fetching the config if not already set so it don't break
  if(!operatingConfig) {
    throw new Error('Operating Config not found');
  }
  const centralAdmin = operatingConfig.info.centralOwner;

  const safetyDepositConfig = await getFractionSafetyDepositConfig(
    fractionManager,
    safetyDeposit,
  );

  const transferAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault),
    )
  )[0];

  const value = new FullRightsTokenTransferArgs();
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(fractionManager),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDepositTokenStore),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDeposit),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(redeemTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(masterMetadata),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.associatedToken),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(priceMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(externalPriceAccount),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(outstandingShareTokenAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.token),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.metadata),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(burnAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(frackHouse),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(safetyDepositConfig),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(centralAdmin),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
  ];

  // add if supplied (meaning not native)
  if(payerTokenAccount) {
    keys.push({
      pubkey: toPublicKey(payerTokenAccount),
      isSigner: false,
      isWritable: true,
    });
  }

  creatorAccounts.forEach(c => {
    keys.push({
      pubkey: toPublicKey(c),
      isSigner: false,
      isWritable: false,
    },);
  })

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
