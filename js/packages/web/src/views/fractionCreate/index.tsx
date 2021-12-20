import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Divider,
  Steps,
  Row,
  Button,
  Col,
  Input,
  Statistic,
  Progress,
  Spin,
  Radio,
  Card,
  Select,
  Checkbox,
} from 'antd';
import { ArtCard } from '../../components/ArtCard';
import { QUOTE_MINT } from '../../constants';
import { Confetti } from '../../components/Confetti';
import { ArtSelector, SelectionContext } from './artSelector';
import {
  MAX_METADATA_LEN,
  useConnection,
  WinnerLimit,
  WinnerLimitType,
  toLamports,
  useMint,
  Creator,
  PriceFloor,
  PriceFloorType,
  MetadataKey,
  StringPublicKey,
  WalletSigner,
  MasterEditionV1,
  MasterEditionV2,
  ParsedAccount
} from '@oyster/common';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { MintLayout, AccountLayout, Token } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import { capitalize, String } from 'lodash';
import {
  WinningConfigType,
  AmountRange,
  getAuctionKeys,
  getWhitelistedCreator,
  startAuction,
  WhitelistedCreator,
  ParticipationConfigV2,
  TupleNumericType,
  SafetyDepositConfig,
  ParticipationStateV2,
  StoreIndexer,
} from '@oyster/common/dist/lib/models/metaplex/index';
import moment from 'moment';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import BN from 'bn.js';
import { constants } from '@oyster/common';
import { DateTimePicker } from '../../components/DateTimePicker';
import { AmountLabel } from '../../components/AmountLabel';
import { useMeta } from '../../contexts';
import useWindowDimensions from '../../utils/layout';
import { PlusCircleOutlined } from '@ant-design/icons';
import { SystemProgram } from '@solana/web3.js';
import { activateVault } from '../../../../common/src/actions/vault';
import { stringify } from 'querystring';
import { createExternalFractionPriceAccount } from '../../actions/createExternalFractionPriceAccoint';
import { createVault } from '../../actions/createVault';
import { addTokensToVault, SafetyDepositInstructionTemplate} from '../../actions/addTokensToVault';
import { deprecatedPopulatePrintingTokens } from '../../actions/deprecatedPopulatePrintingTokens';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

const { Option } = Select;
const { Step } = Steps;
const { ZERO } = constants;

// export enum FractionCategory {
//   Limited
// }

export interface ICreatePartialFractionArgs {
  /// Token mint for the SPL token used for bidding.
  tokenMint: StringPublicKey;

  /// Ticker name of the fraction to be created
  ticker: string | null;

  /// Total supply of the fractions to make
  maxSupply: BN;

  /// Price required to buyout the NFT item(s) from the vault
  buyoutPrice: BN;

  /// The resource being fractioned. See AuctionData.
  //resource: StringPublicKey;

  /// TODO try to bring this back some day. Had to remove this due to a stack access violation bug
  /// interactin that happens in metaplex during redemptions due to some low level rust error
  /// that happens when AuctionData has too many fields. This field was the least used.
  ///pub resource: Pubkey, 

  // ^^^^^ from AuctionData talking about resource property

}

export interface ICreateFractionArgs extends ICreatePartialFractionArgs {
  /// Authority
  authority: StringPublicKey;
}

// TODO might be able to delete fraction manager and just import safety deposit draft from original auction file

export interface FractionState {

  // listed NFTs
  items: SafetyDepositDraft[];

  // Amount required for an address to purchase the item
  buyoutPrice: number;

  // Number of fractions to be made (the supply of the token)
  fractionSupply: number;

  // The ticker name of the fractions created. set to a maximum of 4 (to start)
  ticker: string;

  // The category of fractionalisation this is
  //category: FractionCategory;
}

// TODO :: Maybe have to add enum handling for different types of nft (master copy, limited edition, etc), maybe not though

export const FractionCreateView = () => {
  const connection = useConnection();
  const wallet : WalletSigner = useWallet();
  const { whitelistedCreatorsByCreator, storeIndexer } = useMeta();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const mint = useMint(QUOTE_MINT);
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<number>(0);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [fractionObj, setFractionObj] =
    useState<
      | {
          vault: StringPublicKey;
          fractionTokenMint: StringPublicKey;
          fractionManager: StringPublicKey;
        }
      | undefined
    >(undefined);
  const [attributes, setAttributes] = useState<FractionState>({
    items: [],
    buyoutPrice: 0,
    fractionSupply: 0,
    ticker: "",
  });

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoNextStep(0);
  }, [step_param]);

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step;
    history.push(`/frack/create/${nextStep.toString()}`);
  };

  const createFraction = async () => {

    // Ensure wallet is provided
    if(wallet && wallet.publicKey) {

      // NOTE: Called partial fraction args as it is not all of the arguments!! later on in logic authority is added I think
      const fractionVaultSettings: ICreatePartialFractionArgs = {
        tokenMint: QUOTE_MINT.toBase58(),
        maxSupply: new BN(attributes.fractionSupply * LAMPORTS_PER_SOL),
        buyoutPrice: new BN((attributes.buyoutPrice) * LAMPORTS_PER_SOL),
        ticker: attributes.ticker,
      };

      // Get items
      // NOTE if fails I might be getting this wrong. check
      const safetyDepositDrafts = attributes.items;

      // look where i might need to put this
      const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
      );
    
      const {
        externalPriceAccount,
        priceMint,
        instructions: epaInstructions,
        signers: epaSigners,
      } = await createExternalFractionPriceAccount(connection, wallet, fractionVaultSettings.maxSupply, fractionVaultSettings.buyoutPrice);
    // TODO - Also I think i dont need fractionExternalPriceAccount -> maybe use normal definition?
    
      const {
        instructions: createVaultInstructions,
        signers: createVaultSigners,
        vault,
        fractionalMint,
        redeemTreasury,
        fractionTreasury,
      } = await createVault(connection, wallet, priceMint, externalPriceAccount);


      const safetyDepositConfigsWithPotentiallyUnsetTokens =
      await buildSafetyDepositArray(
        wallet,
        safetyDepositDrafts
      );

      // Only creates for PrintingV1 deprecated configs
      const {
        instructions: populateInstr,
        signers: populateSigners,
        safetyDepositConfigs,
      } = await deprecatedPopulatePrintingTokens(
        connection,
        wallet,
        safetyDepositConfigsWithPotentiallyUnsetTokens,
      );

      // Add tokens to vault
      const {
        instructions: addTokenInstructions,
        signers: addTokenSigners,
        safetyDepositTokenStores,
      } = await addTokensToVault(connection, wallet, vault, safetyDepositConfigs);
    
      // THIS CREATES THE SHARES
      await activateVault(
        new BN(fractionVaultSettings.maxSupply),
        vault,
        fractionalMint,
        fractionTreasury,
        wallet.publicKey.toBase58(),
        createVaultInstructions,
      );

      // try {
      //   const _fractionObj = await createFractionManager(
      //     connection,
      //     wallet,
      //     whitelistedCreatorsByCreator,
      //     fractionVaultSettings,
      //     safetyDepositDrafts,
      //     QUOTE_MINT.toBase58(),
      //     storeIndexer,
      //   );
      //   setFractionObj(_fractionObj);
      // }catch(Exception) {
      //   // TODO!!! ADD ERROR handling for when user doesnt go through with fraction creation
      // }
    }else {
      // TODO catch when user wallet isnt defined. can a user get to this point?
    }
  };

  const copiesStep = (
    <CopiesStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const priceFractionsStep = (
    <PriceFractionsStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const reviewStep = (
    <ReviewStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
      connection={connection}
    />
  );

  // Where we actually call the create fractions function
  const waitStep = (
    <WaitingStep createFraction={createFraction} confirm={() => gotoNextStep()} />
  );

  const congratsStep = <Congrats fraction={fractionObj} />;

  const steps = [
      ['Copies', copiesStep],
      ['Create Supply', priceFractionsStep],
      ['Review', reviewStep],
      ['Frack', waitStep],
      [undefined, congratsStep],
    ]
  ;

  return (
    <>
      <Row className="creator-base-page" style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              {steps
                .filter(_ => !!_[0])
                .map((step, idx) => (
                  <Step title={step[0]} key={idx} />
                ))}
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          {steps[step][1]}
          {0 < step && stepsVisible && (
            <div style={{ margin: 'auto', width: 'fit-content' }}>
              <Button onClick={() => gotoNextStep(step - 1)}>Back</Button>
            </div>
          )}
        </Col>
      </Row>
    </>
  );
};


const CopiesStep = (props: {
  attributes: FractionState;
  setAttributes: (attr: FractionState) => void;
  confirm: () => void;
}) => {
  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

  // MIGHT NEED FILTERS IN THE FUTURE 
  let filter: (i: SafetyDepositDraft) => boolean = (i: SafetyDepositDraft) =>
    true;
  // if (props.attributes.category === FractionCategory.Limited) {
  //   filter = (i: SafetyDepositDraft) =>
  //     !!i.masterEdition && !!i.masterEdition.info.maxSupply;
  // } else if (props.attributes.category === FractionCategory.Open) {
  //   filter = (i: SafetyDepositDraft) =>
  //     !!(
  //       i.masterEdition &&
  //       (i.masterEdition.info.maxSupply === undefined ||
  //         i.masterEdition.info.maxSupply === null)
  //     );
  // }

  let overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 0 }}>
        <h2>Select an Item to Fraktionalize</h2>
        <p style={{ fontSize: '1.2rem' }}>
          Select the item(s) that you want to add to the vault.  <a>What is a vault?</a>
        </p>
      </Row>
      <Row className="content-action">
        <Col xl={24}>
          <ArtSelector
            filter={artistFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items });
            }}
            allowMultiple={true}
            selectionContext={SelectionContext.chooseToFrack}
          >
            Select NFTS to Insert into Vault
          </ArtSelector>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.confirm();
          }}
          className="action-btn"
        >
          Continue to Fraction Creation
        </Button>
      </Row>
    </>
  );
};

const PriceFractionsStep = (props: {
  attributes: FractionState;
  setAttributes: (attr: FractionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Configure Fractions</h2>
        <p>Set the price and total supply of your soon-to-be fraction tokens!</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          <label className="action-field">
            <span className="field-title">Price</span>
            <span className="field-info">
              This is the Starting Price of the vault's contents. If someone wants to buyout the vaults item(s), they will pay this price. This changes as people buy and sell the fractions if this fraction has been registered on a DEX.
            </span>
            <Input
              type="number"
              min={0}
              autoFocus
              className="input"
              placeholder="Buyout Price"
              prefix="◎"
              suffix="SOL"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  buyoutPrice: parseFloat(info.target.value)
                })
              }
            />
          </label>

          <label className="action-field">
            <span className="field-title">Tick Size</span>
            <span className="field-info">
              Number of Tokens to Mint
            </span>
            <Input
              type="number"
              min={0}
              className="input"
              placeholder="Token Supply"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  fractionSupply: parseInt(info.target.value),
                })
              }
            />
          </label>ticker

          <label className="action-field">
            <span className="field-title">Tick Size</span>
            <span className="field-info">
               Ticker Symbol of Fractions (4-5 letter name for your fractions)
            </span>
            <Input
              type="string"
              min={0}
              className="input"
              placeholder="Ticker"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  ticker: info.target.value,
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};


const ReviewStep = (props: {
  confirm: () => void;
  attributes: FractionState;
  setAttributes: Function;
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  useEffect(() => {
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ]);

    // TODO: add
  }, [setCost]);

  let item = props.attributes.items?.[0];

  return (
    <>
      <Row className="call-to-action">
        <h2>Review and Fractionalize</h2>
        <p>Review your listing before fractionalising the contents in the vault</p>
      </Row>
      <Row className="content-action">
        <Col xl={12}>
          {item?.metadata.info && (
            <ArtCard pubkey={item.metadata.pubkey} small={true} />
          )}
        </Col>
        <Col className="section" xl={12}>
          {cost ? (
            <AmountLabel title="Cost to Create Fractions" amount={cost} />
          ) : (
            <Spin />
          )}
        </Col>
      </Row>
      <Row style={{ display: 'block' }}>
        <Divider />
        <Statistic
          className="create-statistic"
          title="Ticker Symbol"
          value={
            props.attributes.ticker
              ? props.attributes.ticker
              : ''
          }
        />
        <br />
        {props.attributes.buyoutPrice && (
          <Statistic
            className="create-statistic"
            title="The Buyout Price of the vault's contents."
            value={props.attributes.buyoutPrice}
          />
        )}
        <Divider />
        <Statistic
          className="create-statistic"
          title="Maximum supply of fractions"
          value={props.attributes.fractionSupply}
        />
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.confirm();
          }}
          className="action-btn"
        >
        Frack Assets
        </Button>
      </Row>
    </>
  );
};

const WaitingStep = (props: {
  createFraction: () => Promise<void>;
  confirm: () => void;
}) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const func = async () => {
      const inte = setInterval(
        () => setProgress(prog => Math.min(prog + 1, 99)),
        600,
      );
      await props.createFraction();
      clearInterval(inte);
      props.confirm();
    };
    func();
  }, []);

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Progress type="circle" percent={progress} />
      <div className="waiting-title">
        Your creation is being listed with Metaplex...
      </div>
      <div className="waiting-subtitle">This can take up to 30 seconds.</div>
    </div>
  );
};

// TODO !!! In this step the fraction property is going to hold different things that currently
// Have changed kinda:
// fractionTokenMint - the public key of the new mint of the spl token just created to represent the fractions
// fractionManager - the manager of all the things to do with the fractionalisation. NOTE not sure yet how big of a part this plays
const Congrats = (props: {
  fraction?: {
    vault: StringPublicKey;
    fractionTokenMint: StringPublicKey;
    fractionManager: StringPublicKey;
  };
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've fractionalised this on Frackr, check out the new generation of DEFI!",
      url: `${
        window.location.origin
      }/#/auction/${props.fraction?.fractionTokenMint.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  return (
    <>
      <div
        style={{
          marginTop: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div className="waiting-title">
          Congratulations! Your new token is now live!
        </div>
        <div className="congrats-button-container">
          <Button
            className="metaplex-button"
            onClick={_ => window.open(newTweetURL(), '_blank')}
          >
            <span>Share it on Twitter</span>
            <span>&gt;</span>
          </Button>
          <Button
            className="metaplex-button"
            onClick={_ =>
              history.push(`/auction/${props.fraction?.fractionTokenMint.toString()}`)
            }
          >
            <span>See it in your vaults</span>
            <span>&gt;</span>
          </Button>
        </div>
      </div>
      <Confetti />
    </>
  );
};


async function buildSafetyDepositArray(
  wallet: WalletSigner,
  safetyDeposits: SafetyDepositDraft[],
): Promise<SafetyDepositInstructionTemplate[]> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const safetyDepositTemplates: SafetyDepositInstructionTemplate[] = [];
  safetyDeposits.forEach((s, i) => {
    const maxAmount = [...s.amountRanges.map(a => a.amount)]
      .sort()
      .reverse()[0];

    const maxLength = [...s.amountRanges.map(a => a.length)]
      .sort()
      .reverse()[0];
    safetyDepositTemplates.push({
      box: {
        tokenAccount:
          s.winningConfigType !== WinningConfigType.PrintingV1
            ? s.holding
            : s.printingMintHolding,
        tokenMint:
          s.winningConfigType !== WinningConfigType.PrintingV1
            ? s.metadata.info.mint
            : (s.masterEdition as ParsedAccount<MasterEditionV1>)?.info
                .printingMint,
        amount:
          s.winningConfigType == WinningConfigType.PrintingV2 ||
          s.winningConfigType == WinningConfigType.FullRightsTransfer
            ? new BN(1)
            : new BN(
                s.amountRanges.reduce(
                  (acc, r) => acc.add(r.amount.mul(r.length)),
                  new BN(0),
                ),
              ),
      },
      config: new SafetyDepositConfig({
        directArgs: {
          auctionManager: SystemProgram.programId.toBase58(),
          order: new BN(i),
          amountRanges: s.amountRanges,
          amountType: maxAmount.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8,
          lengthType: maxLength.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8,
          winningConfigType: s.winningConfigType,
          participationConfig: null,
          participationState: null,
        },
      }),
      draft: s,
    });
  });


  console.log('Temps', safetyDepositTemplates);
  return safetyDepositTemplates;
}
