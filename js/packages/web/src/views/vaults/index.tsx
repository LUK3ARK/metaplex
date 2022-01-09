import { useMeta } from '../../contexts';
import { useState, useEffect } from 'react';
import { Layout, Row, Col, Tabs, Button, Dropdown, Menu } from 'antd';
import { DownOutlined } from "@ant-design/icons";
import { CardLoader } from '../../components/MyLoader';
import { VaultViewState } from './types';
import { useItems } from './hooks/useItems';
import { isMetadata } from '../artworks/utils';
import ItemCard from '../artworks/components/ItemCard';
import { useUserAccounts } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

const { TabPane } = Tabs;
const { Content } = Layout;


export const VaultsView = () => {
    const { connected } = useWallet();
    const { isLoading, pullAllMetadata, storeIndexer, pullVaultItemsPage } = useMeta();
    const [activeKey, setActiveKey] = useState(VaultViewState.Metaplex);
    const { userAccounts } = useUserAccounts();

    const userItems = useItems({ activeKey });

    useEffect(() => {
      pullVaultItemsPage(userAccounts);
    }, []);

    const artworkGrid = (
        <div className="artwork-grid">
          {isLoading && [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
          {!isLoading &&
            userItems.map(item => {
              const pubkey = isMetadata(item)
                ? item.pubkey
                : 1010101010010;
    
              return <ItemCard item={item} key={pubkey} />;
            })}
        </div>
      );


    const refreshButton = connected && storeIndexer.length !== 0 && (
      <Dropdown.Button
        className={"refresh-button padding0"}
        onClick={() => pullItemsPage(userAccounts)}
        icon={<DownOutlined />}
        overlayClassName={"refresh-overlay"}
        overlay={
          <Menu className={'gray-dropdown'}>
            <Menu.Item onClick={() => pullAllMetadata()}>Load All Metadata</Menu.Item>
          </Menu>
        }
      >
        Refresh
      </Dropdown.Button>
    );


    return (
      <Layout style={{ margin: 0, marginTop: 30 }}>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            <Row>
              <Tabs
                activeKey={activeKey}
                onTabClick={key => setActiveKey(key as VaultViewState)}
                tabBarExtraContent={refreshButton}
              >
                <TabPane
                  tab={<span className="tab-title">All</span>}
                  key={VaultViewState.Metaplex}
                >
                  {artworkGrid}
                </TabPane>
                {connected && (
                  <TabPane
                    tab={<span className="tab-title">Created</span>}
                    key={VaultViewState.Created}
                  >
                    {artworkGrid}
                  </TabPane>
                )}
                {connected && (
                  <TabPane
                    tab={<span className="tab-title">Active</span>}
                    key={VaultViewState.Active}
                  >
                    {artworkGrid}
                  </TabPane>
                )}
              </Tabs>
            </Row>
          </Col>
        </Content>
      </Layout>
    );
}