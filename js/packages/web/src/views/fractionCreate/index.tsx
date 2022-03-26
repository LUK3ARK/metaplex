import React, { useEffect, useState, } from 'react';
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
} from 'antd';
import { ArtCard } from './../../components/ArtCard';
import { QUOTE_MINT } from './../../constants';
import { Confetti } from './../../components/Confetti';
import { ArtSelector } from './artSelector';
import {
  MAX_METADATA_LEN,
  useConnection,
  useMint,
  Creator,
  ICreateFractionArgs,
  StringPublicKey,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
//import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
// TODO ^^ check if I need to implement this (where else is this used?)
import { Connection, LAMPORTS_PER_SOL, PublicKey, } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { MintInfo, MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import BN from 'bn.js';
import { AmountLabel } from '../../components/AmountLabel';
import { useMeta } from '../../contexts';
import useWindowDimensions from '../../utils/layout';
import { useTokenList } from '../../contexts/tokenList';
import { TokenInfo } from '@solana/spl-token-registry'
import { createFractionManager, FractionSafetyDepositDraft } from '../../actions/createFractionManager';
import TokenDialog, { TokenButton } from '../../components/TokenDialog';

const { Step } = Steps;

export interface FractionState {

  // listed NFTs
  items: FractionSafetyDepositDraft[];

  // Amount required for an address to purchase the item
  buyoutPrice: number;

  // Number of fractions to be made (the supply of the token)
  fractionSupply: number;

  // The ticker name of the fractions created. set to a maximum of 4 (to start)
  ticker: string;

  quoteMintAddress: string;
  quoteMintInfo: MintInfo;
  quoteMintInfoExtended: TokenInfo;
}


export const FractionCreateView = () => {
  const connection = useConnection();
  const wallet = useWallet();
  const { whitelistedFrackersByFracker, frackHouseIndexer} = useMeta(); // todo - get 'storeIndexer' from this to (maybe at some point i have got rid of store functionality)
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<number>(0);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [fractionObj, setFractionObj] =
    useState<
      | {
          vault: StringPublicKey;
          fractionManager: StringPublicKey;
          fractionalMint: StringPublicKey;
        }
      | undefined
    >(undefined);
  const [attributes, setAttributes] = useState<FractionState>({
    items: [],
    buyoutPrice: 0,
    fractionSupply: 0,
    ticker: "",
    quoteMintAddress: '',
    //@ts-ignore
    quoteMintInfo: undefined,
    //@ts-ignore
    quoteMintInfoExtended: undefined,
  });

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoNextStep(0);
  }, [step_param]);

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step;
    history.push(`/fraction/create/${nextStep.toString()}`);
  };

  const createFraction = async () => {

    // Ensure wallet is provided
    if(wallet && wallet.publicKey) {

      // todo NOTE: Called partial fraction args as it is not all of the arguments!! later on in logic authority is added I think
      // MIGHT NEED TO add priceTick and other stuff, but this is likely to be taken care of when implementing serum
      const fractionVaultSettings: ICreateFractionArgs = {
        tokenMint: QUOTE_MINT.toBase58(),
        maxSupply: new BN(attributes.fractionSupply * LAMPORTS_PER_SOL),
        buyoutPrice: new BN(attributes.buyoutPrice * LAMPORTS_PER_SOL),
        ticker: attributes.ticker,
      };

      const safetyDepositDrafts = attributes.items;

      // todo - remove debug
      console.log("quotemint address is " + attributes.quoteMintAddress);
      const _fractionObj = await createFractionManager(
        connection,
        wallet,
        fractionVaultSettings,
        safetyDepositDrafts,
        attributes.quoteMintAddress,
        frackHouseIndexer,
      );
      setFractionObj(_fractionObj);

      console.log("number of safetyDeposits in draft: " + safetyDepositDrafts.length);

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

  const congratsStep = <Congrats />;

  const steps = [
      ['Copies', copiesStep],
      ['Supply', priceFractionsStep],
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


const CopiesStep = ({
  attributes,
  setAttributes,
  confirm,
}: {
  attributes: FractionState;
  setAttributes: (attr: FractionState) => void;
  confirm: () => void;
}) => {


  let artistFilter = (i: FractionSafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

  // let filter: (i: FractionSafetyDepositDraft) => boolean = (i: FractionSafetyDepositDraft) =>
  //   true;

  // let overallFilter = (i: FractionSafetyDepositDraft) => filter(i) && artistFilter(i);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 0 }}>
        <h2>Select an Item to Frack</h2>
        <p style={{ fontSize: '1.2rem' }}>
          Select the item(s) that you want to add to the vault.  <a>What is a vault?</a>
        </p>
      </Row>
      <Row className="content-action">
        <Col xl={24}>
          <ArtSelector
            filter={artistFilter}
            selected={attributes.items}
            setSelected={items => {
              setAttributes({ ...attributes, items });
            }}
            allowMultiple={true}
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
            confirm();
          }}
          className="action-btn"
        >
          Continue to Fraction Creation
        </Button>
      </Row>
    </>
  );
};

const PriceFractionsStep = ({
  attributes,
  setAttributes,
  confirm,
}: {
  attributes: FractionState;
  setAttributes: (attr: FractionState) => void;
  confirm: () => void;
}) => {

  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT);

  const { hasOtherTokens, tokenMap } = useTokenList();
  
  const mintInfo = tokenMap.get((!mint? QUOTE_MINT.toString(): mint.toString()));
  
  attributes.quoteMintAddress = mint? mint.toBase58(): QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = useMint(attributes.quoteMintAddress)!;
    attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(
      attributes.quoteMintAddress,
    )!;
  }
  // give default value to mint


  return (
    <>
      <Row className="call-to-action">
        <h2>Configure Fractions</h2>
        <p>Set the price and total supply of your fraction tokens.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          {hasOtherTokens && (
            <label className="action-field">
              <span className="field-title">Auction mint</span>
              <TokenButton
                mint={mint}
                onClick={() => setShowTokenDialog(true)}
              />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false);
                }}
              />
            </label>
          )}
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
              suffix={mintInfo?.symbol || 'CUSTOM'}
              onChange={info =>
                setAttributes({
                  ...attributes,
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
                setAttributes({
                  ...attributes,
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
                setAttributes({
                  ...attributes,
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
          onClick={confirm}
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
  };
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've fractionalized this on Frackr, check out the new generation of ownership!",
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
