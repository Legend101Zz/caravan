import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Tabs,
  Tab,
  Box,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import {
  setWalletModeAction as setWalletModeActionImport,
  WALLET_MODES,
} from "../../actions/walletActions";
import { setRequiredSigners as setRequiredSignersAction } from "../../actions/transactionActions";
import { MAX_FETCH_UTXOS_ERRORS, MAX_TRAILING_EMPTY_NODES } from "./constants";
import WalletDeposit from "./WalletDeposit";
import WalletSpend from "./WalletSpend";
import TransactionsTab from "./TransactionsTab/index";
import { SlicesTableContainer } from "../Slices";
import UTXOOptimizer from "./UTXOOptimizer";
import WalletHealthDashboard from "./WalletHealthDashboard";

class WalletControl extends React.Component {
  scrollRef = React.createRef();

  componentDidMount = () => {
    this.scrollRef.current.scrollIntoView({ behavior: "smooth" });
  };

  render = () => {
    const { walletMode } = this.props;
    return (
      <div>
        <Tabs
          ref={this.scrollRef}
          value={walletMode}
          onChange={this.handleModeChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          {this.addressesAreLoaded() && [
            <Tab label="Addresses" value={WALLET_MODES.VIEW} key={0} />,
            <Tab label="Receive" value={WALLET_MODES.DEPOSIT} key={1} />,
            <Tab label="Send" value={WALLET_MODES.SPEND} key={2} />,
            <Tab
              label="Pending Transactions"
              value={WALLET_MODES.TRANSACTIONS}
              key={3}
            />,
            <Tab label="Health" value={WALLET_MODES.HEALTH} key={4} />,
          ]}
        </Tabs>
        <Box mt={2}>{this.renderModeComponent()}</Box>
      </div>
    );
  };

  renderModeComponent = () => {
    const { walletMode, addNode, updateNode } = this.props;
    if (this.addressesAreLoaded()) {
      if (walletMode === WALLET_MODES.DEPOSIT) return <WalletDeposit />;
      if (walletMode === WALLET_MODES.SPEND)
        return <WalletSpend addNode={addNode} updateNode={updateNode} />;
      if (walletMode === WALLET_MODES.VIEW) return <SlicesTableContainer />;
      if (walletMode === WALLET_MODES.TRANSACTIONS)
        return <TransactionsTab refreshWallet={this.props.refreshNodes} />;
      if (walletMode === WALLET_MODES.HEALTH)
        return this.renderWalletHealthDashboard();
    }
    const progress = this.progress();
    return [
      <div style={{ textAlign: "center", marginBottom: "5em" }} key={0}>
        <CircularProgress variant="indeterminate" />
      </div>,
      <LinearProgress variant="determinate" value={progress} key={1} />,
    ];
  };

  renderWalletHealthDashboard = () => {
    const {
      deposits,
      change,
      client,
      signatureImporters,
      network,
      addressType,
    } = this.props;

    // Prepare the data for the health dashboard
    const inputData = {
      network,
      addressType,
      walletAddresses: this.getWalletAddresses(),
      transactions: this.getAllTransactions(),
      utxos: this.getAllUTXOs(),
    };

    return <WalletHealthDashboard {...inputData} />;
  };

  getWalletAddresses = () => {
    const { deposits, change } = this.props;
    const addresses = [];

    // Extract deposit addresses
    Object.values(deposits.nodes || {}).forEach((node) => {
      if (node.multisig && node.multisig.address) {
        addresses.push(node.multisig.address);
      }
    });

    // Extract change addresses
    Object.values(change.nodes || {}).forEach((node) => {
      if (node.multisig && node.multisig.address) {
        addresses.push(node.multisig.address);
      }
    });

    return addresses;
  };

  getAllTransactions = () => {
    const { deposits, change } = this.props;
    const transactions = [];

    // Process all nodes to find transactions
    const allNodes = [
      ...Object.values(deposits.nodes || {}),
      ...Object.values(change.nodes || {}),
    ];

    allNodes.forEach((node) => {
      if (node.utxos && node.utxos.length > 0) {
        node.utxos.forEach((utxo) => {
          if (!transactions.some((tx) => tx.txid === utxo.txid)) {
            transactions.push({
              txid: utxo.txid,
              vout: [
                {
                  scriptPubkeyAddress: node.multisig.address,
                  value: parseFloat(utxo.amount),
                },
              ],
              vin: [],
              status: {
                confirmed: utxo.confirmed,
                blockTime: utxo.time,
              },
              value: parseFloat(utxo.amount),
              valueToWallet: parseFloat(utxo.amount),
              size: 0,
              weight: 0,
              fee: 0,
              isReceived: true,
              isSend: false,
            });
          }
        });
      }
    });

    return transactions;
  };

  getAllUTXOs = () => {
    const { deposits, change } = this.props;
    const addressUtxos = {};

    // Process deposit UTXOs
    Object.values(deposits.nodes || {}).forEach((node) => {
      if (
        node.multisig &&
        node.multisig.address &&
        node.utxos &&
        node.utxos.length > 0
      ) {
        const address = node.multisig.address;
        addressUtxos[address] = (addressUtxos[address] || []).concat(
          node.utxos.map((utxo) => ({
            txid: utxo.txid,
            vout: utxo.index,
            value: parseFloat(utxo.amount),
            status: {
              confirmed: utxo.confirmed,
              block_time: utxo.time || Math.floor(Date.now() / 1000),
            },
          })),
        );
      }
    });

    // Process change UTXOs
    Object.values(change.nodes || {}).forEach((node) => {
      if (
        node.multisig &&
        node.multisig.address &&
        node.utxos &&
        node.utxos.length > 0
      ) {
        const address = node.multisig.address;
        addressUtxos[address] = (addressUtxos[address] || []).concat(
          node.utxos.map((utxo) => ({
            txid: utxo.txid,
            vout: utxo.index,
            value: parseFloat(utxo.amount),
            status: {
              confirmed: utxo.confirmed,
              block_time: utxo.time || Math.floor(Date.now() / 1000),
            },
          })),
        );
      }
    });

    return addressUtxos;
  };

  progress = () => {
    const { change, deposits } = this.props;
    return (
      (100 * (deposits.trailingEmptyNodes + change.trailingEmptyNodes)) /
      (2 * MAX_TRAILING_EMPTY_NODES)
    );
  };

  addressesAreLoaded = () => {
    const { change, deposits, nodesLoaded } = this.props;
    if (nodesLoaded) return true;
    return (
      (deposits.trailingEmptyNodes >= MAX_TRAILING_EMPTY_NODES ||
        deposits.fetchUTXOsErrors >= MAX_FETCH_UTXOS_ERRORS) &&
      (change.trailingEmptyNodes >= MAX_TRAILING_EMPTY_NODES ||
        change.fetchUTXOsErrors >= MAX_FETCH_UTXOS_ERRORS)
    );
  };

  handleModeChange = (_event, mode) => {
    const { setMode, requiredSigners, setRequiredSigners, signatureImporters } =
      this.props;
    if (
      mode === WALLET_MODES.SPEND &&
      Object.keys(signatureImporters).length !== requiredSigners
    ) {
      setRequiredSigners(requiredSigners); // this will generate signature importers
    }
    setMode(mode);
  };
}

WalletControl.propTypes = {
  addNode: PropTypes.func.isRequired,
  change: PropTypes.shape({
    trailingEmptyNodes: PropTypes.number,
    fetchUTXOsErrors: PropTypes.number,
    nodes: PropTypes.shape({}),
  }).isRequired,
  deposits: PropTypes.shape({
    trailingEmptyNodes: PropTypes.number,
    fetchUTXOsErrors: PropTypes.number,
    nodes: PropTypes.shape({}),
  }).isRequired,
  nodesLoaded: PropTypes.bool.isRequired,
  requiredSigners: PropTypes.number.isRequired,
  setMode: PropTypes.func.isRequired,
  setRequiredSigners: PropTypes.func.isRequired,
  signatureImporters: PropTypes.shape({}).isRequired,
  updateNode: PropTypes.func.isRequired,
  walletMode: PropTypes.number.isRequired,
  refreshNodes: PropTypes.func.isRequired,
  addressType: PropTypes.string.isRequired,
  client: PropTypes.shape({}).isRequired,
};

function mapStateToProps(state) {
  return {
    ...state.wallet,
    ...state.wallet.common,
    network: state.settings.network,
    addressType: state.settings.addressType,
    requiredSigners: state.spend.transaction.requiredSigners,
    signatureImporters: state.spend.signatureImporters,
    client: state.client,
  };
}

const mapDispatchToProps = {
  setMode: setWalletModeActionImport,
  setRequiredSigners: setRequiredSignersAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletControl);
