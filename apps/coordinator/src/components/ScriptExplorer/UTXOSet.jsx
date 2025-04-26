import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  blockExplorerTransactionURL,
  satoshisToBitcoins,
} from "@caravan/bitcoin";
import {
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Typography,
  Checkbox,
  Box,
  Chip,
} from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import BigNumber from "bignumber.js";
import { externalLink } from "utils/ExternalLink";
import Copyable from "../Copyable";
import HealthMetrics from "../Wallet/HealthMetrics";
import UTXOOptimizer from "../Wallet/UTXOOptimizer";

// Actions
import { setInputs as setInputsAction } from "../../actions/transactionActions";

// Assets
import styles from "./styles.module.scss";

class UTXOSet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputsSatsSelected: props.inputsTotalSats,
      localInputs: props.inputs.map((input) => {
        return {
          ...input,
          checked: props.selectAll,
        };
      }),
      toggleAll: true,
    };
  }

  componentDidUpdate(prevProps) {
    // This function exists because we need to respond to the parent node having
    // its select/spend checkbox clicked (toggling select-all or select-none).
    // None of this needs to happen on the redeem script interface.
    const { multisig, autoSpend } = this.props;
    if (multisig && !autoSpend) {
      const { node, existingTransactionInputs } = this.props;
      const { localInputs } = this.state;
      const prevMyInputsBeingSpent = this.filterInputs(
        localInputs,
        prevProps.existingTransactionInputs,
        true,
      ).length;
      const myInputsBeingSpent = this.filterInputs(
        localInputs,
        existingTransactionInputs,
        true,
      ).length;

      const isFullSpend = myInputsBeingSpent === localInputs.length;

      // If the spend bool on the node changes, toggleAll the checks.
      // but that's not quite enough because if a single UTXO is selected
      // then it is also marked from not spend -> spend ... so don't want
      // to toggleAll in that case. Furthermore, if you have 5 UTXOs and
      // 2 selected and *then* click select all ... we also need to toggelAll.
      if (
        (prevProps.node.spend !== node.spend ||
          myInputsBeingSpent !== prevMyInputsBeingSpent) &&
        isFullSpend
      ) {
        this.toggleAll(node.spend);
      }
    }
  }

  handleOptimizeUTXOs = (optimizedUtxos) => {
    const { localInputs } = this.state;

    // Reset all UTXOs to unchecked first
    localInputs.forEach((input) => {
      input.checked = false;
    });

    // Then mark the optimized ones as checked
    optimizedUtxos.forEach((optimizedUtxo) => {
      const matchingInput = localInputs.find(
        (input) =>
          input.txid === optimizedUtxo.txid &&
          input.index === optimizedUtxo.index,
      );

      if (matchingInput) {
        matchingInput.checked = true;
      }
    });

    // Update inputs in the state and redux store
    this.setInputsAndUpdateDisplay(localInputs);
  };

  filterInputs = (localInputs, transactionStoreInputs, filterToMyInputs) => {
    return localInputs.filter((input) => {
      const included = transactionStoreInputs.filter((utxo) => {
        return utxo.txid === input.txid && utxo.index === input.index;
      });
      return filterToMyInputs ? included.length > 0 : included.length === 0;
    });
  };

  toggleInput = (inputIndex) => {
    const { localInputs } = this.state;
    this.setState({ toggleAll: false });

    localInputs[inputIndex].checked = !localInputs[inputIndex].checked;

    this.setInputsAndUpdateDisplay(localInputs);
  };

  toggleAll = (setTo = null) => {
    const { localInputs, toggleAll } = this.state;
    const toggled = !toggleAll;

    localInputs.forEach((input) => {
      const i = input;
      i.checked = setTo === null ? toggled : setTo;
      return i;
    });

    this.setInputsAndUpdateDisplay(localInputs);
    this.setState({ toggleAll: toggled });
  };

  setInputsAndUpdateDisplay = (incomingInputs) => {
    const {
      setInputs,
      multisig,
      bip32Path,
      existingTransactionInputs,
      setSpendCheckbox,
    } = this.props;
    const { localInputs } = this.state;
    let inputsToSpend = incomingInputs.filter((input) => input.checked);
    if (multisig) {
      inputsToSpend = inputsToSpend.map((utxo) => {
        return { ...utxo, multisig, bip32Path };
      });
    }
    const satsSelected = inputsToSpend.reduce(
      (accumulator, input) => accumulator.plus(input.amountSats),
      new BigNumber(0),
    );
    this.setState({
      inputsSatsSelected: satsSelected,
    });
    let totalInputsToSpend = inputsToSpend;

    // The following is only relevant on the wallet interface
    if (multisig) {
      // There are 3 total sets of inputs to care about:
      // 1. localInputs - all inputs from this node/address
      // 2. inputsToSpend - equal to or subset of those from #1 (inputs marked checked==true)
      // 3. existingTransactionInputs - all inputs from all nodes/addresses

      // Check if #3 contains any inputs not associated with this component
      const notMyInputs = this.filterInputs(
        existingTransactionInputs,
        localInputs,
        false,
      );

      if (notMyInputs.length > 0) {
        totalInputsToSpend = inputsToSpend.concat(notMyInputs);
      }

      // Now we push a change up to the top level node so it can update its checkbox
      const numLocalInputsToSpend = inputsToSpend.length;
      if (numLocalInputsToSpend === 0) {
        setSpendCheckbox(false);
      } else if (numLocalInputsToSpend < localInputs.length) {
        setSpendCheckbox("indeterminate");
      } else {
        setSpendCheckbox(true);
      }
    }

    if (totalInputsToSpend.length > 0) {
      setInputs(totalInputsToSpend);
    } else if (multisig) {
      // If we do this on redeem script interface, the panel will disappear
      setInputs([]);
    }
  };

  calculateUTXOHealth = (utxo) => {
    // This is a simplified health calculation for individual UTXOs

    let score = 50; // Start with a neutral score

    // Age-based factors - older UTXOs are generally better for privacy
    if (utxo.confirmed) {
      const ageInDays = (Date.now() / 1000 - utxo.time) / (60 * 60 * 24);
      if (ageInDays > 30)
        score += 20; // Older than a month
      else if (ageInDays > 7) score += 10; // Older than a week
    } else {
      score -= 10; // Unconfirmed UTXOs are less private
    }

    // Amount-based factors - round amounts are less private
    const amount = parseFloat(utxo.amount);
    const isRoundAmount =
      amount === Math.floor(amount) ||
      amount * 10 === Math.floor(amount * 10) ||
      amount * 100 === Math.floor(amount * 100);

    if (isRoundAmount) score -= 10;

    // Dust factor - very small amounts might be dust
    if (amount < 0.0001) score -= 20;

    // Determine health level
    if (score >= 80) return { level: "ideal", score, label: "Ideal" };
    if (score >= 60) return { level: "good", score, label: "Good" };
    if (score >= 40) return { level: "moderate", score, label: "Moderate" };
    return { level: "avoid", score, label: "Avoid" };
  };

  renderInputs = () => {
    const { network, showSelection, finalizedOutputs } = this.props;
    const { localInputs } = this.state;
    return localInputs.map((input, inputIndex) => {
      const confirmedStyle = `${styles.utxoTxid}${
        input.confirmed ? "" : ` ${styles.unconfirmed}`
      }`;
      const confirmedTitle = input.confirmed ? "confirmed" : "unconfirmed";

      // Calculate health for this UTXO
      const health = this.calculateUTXOHealth(input);
      return (
        <TableRow hover key={input.txid}>
          {showSelection && (
            <TableCell>
              <Checkbox
                data-testid={`utxo-checkbox-${inputIndex}`}
                checked={input.checked}
                onClick={() => this.toggleInput(inputIndex)}
                color="primary"
                disabled={finalizedOutputs}
              />
            </TableCell>
          )}
          <TableCell>{inputIndex + 1}</TableCell>
          <TableCell className={confirmedStyle}>
            <Copyable text={input.txid} showIcon showText={false}>
              <code title={confirmedTitle}>{input.txid}</code>
            </Copyable>
          </TableCell>
          <TableCell>
            <Copyable text={input.index.toString()} />
          </TableCell>
          <TableCell>
            <Copyable text={satoshisToBitcoins(input.amountSats)} />
          </TableCell>
          <TableCell>
            <Chip
              label={health.label}
              color={
                health.level === "ideal"
                  ? "success"
                  : health.level === "good"
                    ? "primary"
                    : health.level === "moderate"
                      ? "warning"
                      : "error"
              }
              size="small"
            />
          </TableCell>
          <TableCell>
            {externalLink(
              blockExplorerTransactionURL(input.txid, network),
              <OpenInNew />,
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  render() {
    const {
      inputsTotalSats,
      showSelection = true,
      hideSelectAllInHeader,
      finalizedOutputs,
    } = this.props;
    const { inputsSatsSelected, toggleAll, localInputs } = this.state;
    return (
      <>
        <Typography variant="h5">
          {`Available Inputs (${localInputs.length})`}{" "}
        </Typography>
        <p>The following UTXOs will be spent as inputs in a new transaction.</p>
        <Table>
          <TableHead>
            <TableRow hover>
              {showSelection && !hideSelectAllInHeader && (
                <TableCell>
                  <Checkbox
                    data-testid="utxo-check-all"
                    checked={toggleAll}
                    onClick={() => this.toggleAll()}
                    color="primary"
                    disabled={finalizedOutputs}
                  />
                </TableCell>
              )}
              {hideSelectAllInHeader && <TableCell />}
              <TableCell>Number</TableCell>
              <TableCell>TXID</TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Amount (BTC)</TableCell>
              <TableCell>Health</TableCell>
              <TableCell>View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{this.renderInputs()}</TableBody>
          <TableFooter>
            <TableRow hover>
              <TableCell colSpan={3}>TOTAL:</TableCell>
              <TableCell colSpan={2}>
                {inputsSatsSelected
                  ? satoshisToBitcoins(inputsSatsSelected)
                  : satoshisToBitcoins(inputsTotalSats)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        {localInputs.length > 0 && (
          <>
            <Box mt={3}>
              <UTXOOptimizer
                availableUtxos={localInputs}
                targetAmount={
                  this.state.outputs && this.state.outputs.length > 0
                    ? this.state.outputs.reduce(
                        (sum, output) => sum + parseFloat(output.amount || 0),
                        0,
                      )
                    : 0
                }
                feeRate={this.state.feeRate}
                onOptimize={this.handleOptimizeUTXOs}
              />
            </Box>

            <Box mt={3}>
              <HealthMetrics
                inputs={this.state.inputs}
                outputs={this.state.outputs || []}
                feeRate={this.state.feeRate}
              />
            </Box>
          </>
        )}
      </>
    );
  }
}

UTXOSet.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  setInputs: PropTypes.func.isRequired,
  multisig: PropTypes.oneOfType([PropTypes.shape({}), PropTypes.bool]),
  bip32Path: PropTypes.string,
  showSelection: PropTypes.bool,
  hideSelectAllInHeader: PropTypes.bool,
  selectAll: PropTypes.bool,
  finalizedOutputs: PropTypes.bool.isRequired,
  node: PropTypes.shape({
    spend: PropTypes.bool,
  }),
  existingTransactionInputs: PropTypes.arrayOf(PropTypes.shape({})),
  setSpendCheckbox: PropTypes.func,
  autoSpend: PropTypes.bool.isRequired,
};

UTXOSet.defaultProps = {
  multisig: false,
  bip32Path: "",
  showSelection: true,
  hideSelectAllInHeader: false,
  selectAll: true,
  node: {},
  existingTransactionInputs: [],
  setSpendCheckbox: () => {},
};

function mapStateToProps(state) {
  return {
    ...state.settings,
    outputs: state.spend.transaction.outputs,
    feeRate: state.spend.transaction.feeRate,
    autoSpend: state.spend.transaction.autoSpend,
    finalizedOutputs: state.spend.transaction.finalizedOutputs,
    existingTransactionInputs: state.spend.transaction.inputs,
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UTXOSet);
