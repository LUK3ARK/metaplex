import React, { useMemo, useState } from 'react';
import { Row, Button, Modal, ButtonProps } from 'antd';
import { useUserArtsAsFractionDrafts } from '../../hooks';
import FractionItemCard from './FractionItemCard';
import { FractionSafetyDepositDraft } from '../../actions/createFractionManager';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { SafetyDepositConfig, FractionSafetyDepositConfig } from '@oyster/common';

export interface ArtSelectorProps extends ButtonProps {
  selected: FractionSafetyDepositDraft[];
  setSelected: (selected: FractionSafetyDepositDraft[]) => void;
  allowMultiple: boolean;
  filter?: (i: FractionSafetyDepositDraft) => boolean;
}

export const ArtSelector = (props: ArtSelectorProps) => {
  const { selected, setSelected, allowMultiple, ...rest } = props;
  let fractionItems = useUserArtsAsFractionDrafts();

  // Convert 
  if (props.filter) fractionItems = fractionItems.filter(props.filter);
  const selectedItems = useMemo<Set<string>>(
    () => new Set(selected.map(item => item.metadata.pubkey)),
    [selected],
  );

  const [visible, setVisible] = useState(false);

  const open = () => {
    clear();

    setVisible(true);
  };

  const close = () => {
    setVisible(false);
  };

  const clear = () => {
    setSelected([]);
  };

  const confirm = () => {
    close();
  };

  return (
    <>
      <div className="artwork-grid">
        {selected.map(m => {
          const key = m?.metadata.pubkey || '';
          return (
            <FractionItemCard
              key={key}
              current={m}
              onSelect={open}
              onClose={() => {
                setSelected(selected.filter(_ => _.metadata.pubkey !== key));
                confirm();
              }}
            />
          );
        })}
        {(allowMultiple || selectedItems.size === 0) && (
          <div
            className="ant-card ant-card-bordered ant-card-hoverable art-card"
            style={{ width: 200, height: 300, display: 'flex' }}
            onClick={open}
          >
            <span className="text-center">Add an NFT</span>
          </div>
        )}
      </div>

      <Modal
        visible={visible}
        onCancel={close}
        onOk={confirm}
        width={1100}
        footer={null}
        className={"modalp-40"}
      >
        <Row className="call-to-action" style={{ marginBottom: 0 }}>
          <h2>Select the NFT you want to sell</h2>
          <p style={{ fontSize: '1.2rem' }}>
            Select the NFT that you want to sell copy/copies of.
          </p>
        </Row>
        <Row
          className="content-action"
          style={{ overflowY: 'auto', height: '50vh' }}
        >
          <div className="artwork-grid">
            {fractionItems.map(m => {
              const id = m.metadata.pubkey;
              const isSelected = selectedItems.has(id);

              const onSelect = () => {
                let list = [...selectedItems.keys()];
                // if (allowMultiple) {
                //   list = [];
                // }

                const newSet = isSelected
                  ? new Set(list.filter(item => item !== id))
                  : new Set([...list, id]);

                const selected = fractionItems.filter(item =>
                  newSet.has(item.metadata.pubkey),
                );
                setSelected(selected);

                if (!allowMultiple) {
                  confirm();
                }
              };

              return <FractionItemCard key={id} isSelected={isSelected} current={m} onSelect={onSelect} />;
            })}
          </div>
        </Row>
        <Row>
          <Button
            type="primary"
            size="large"
            onClick={confirm}
            className="action-btn"
          >
            Confirm
          </Button>
        </Row>
      </Modal>
    </>
  );
};


// TODO - Before delete this just make sure that amount ranges is taken cared of in the fraction process
// export interface FractionSafetyDepositDraft {
//   metadata: ParsedAccount<Metadata>;
//   masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
//   edition?: ParsedAccount<Edition>;
//   holding: StringPublicKey;
//   printingMintHolding?: StringPublicKey;
//   fractionWinningConfigType: FractionWinningConfigType;
//   amountRanges: AmountRange[];
//   participationConfig?: ParticipationConfigV2;
// }


// export interface SafetyDepositDraft {
//   metadata: ParsedAccount<Metadata>;
//   masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
//   edition?: ParsedAccount<Edition>;
//   holding: StringPublicKey;
//   printingMintHolding?: StringPublicKey;
//   winningConfigType: WinningConfigType;
//   amountRanges: AmountRange[];
//   participationConfig?: ParticipationConfigV2;
// }