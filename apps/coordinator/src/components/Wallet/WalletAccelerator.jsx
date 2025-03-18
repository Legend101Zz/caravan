import React, { useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import SpeedIcon from "@mui/icons-material/Speed";
import { updateBlockchainClient } from "../../actions/clientActions";

const useStyles = makeStyles((theme) => ({
  card: {
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: "1.2rem",
    marginBottom: theme.spacing(2),
  },
  tableCell: {
    cursor: "pointer",
  },
  selectedRow: {
    backgroundColor: theme.palette.action.selected,
  },
  accelerationMethods: {
    marginTop: theme.spacing(2),
  },
  tabContent: {
    padding: theme.spacing(2),
  },
  actionButton: {
    marginRight: theme.spacing(1),
  },
  infoBox: {
    marginBottom: theme.spacing(2),
  },
}));

// Tabs for different acceleration methods
const TABS = {
  TRANSACTION: 0,
  RBF: 1,
  CPFP: 2,
};

const WalletAccelerator = ({
  pendingTransactions,
  client,
  network,
  getBlockchainClient,
  requiredSigners,
  totalSigners,
  addressType,
}) => {
  const classes = useStyles();
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS.TRANSACTION);

  // Dummy function to simulate transaction analysis
  const handleTransactionSelect = async (tx) => {
    setSelectedTx(tx);
    setActiveTab(TABS.TRANSACTION);
    setLoading(true);
    setError("");

    // Simulate API call/analysis
    setTimeout(() => {
      setLoading(false);
      // For demo purposes, we'll assume all transactions can use both RBF and CPFP
    }, 1500);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderContent = () => {
    if (!selectedTx) {
      return (
        <Box textAlign="center" py={4}>
          <Typography variant="body1">
            Select a transaction to view acceleration options
          </Typography>
        </Box>
      );
    }

    if (loading) {
      return (
        <Box textAlign="center" py={4}>
          <CircularProgress />
          <Typography variant="body1" mt={2}>
            Analyzing transaction...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      );
    }

    return (
      <Box>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Transaction Details" />
          <Tab label="Replace-By-Fee (RBF)" />
          <Tab label="Child-Pays-for-Parent (CPFP)" />
        </Tabs>

        <Box className={classes.tabContent}>
          {activeTab === TABS.TRANSACTION && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Transaction Details
              </Typography>
              <Typography variant="body1" gutterBottom>
                Transaction ID: {selectedTx.txid}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Fee Rate: {selectedTx.feeRate.toFixed(2)} sats/vB
              </Typography>
              <Typography variant="body1" gutterBottom>
                Status: Pending
              </Typography>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Acceleration Options</AlertTitle>
                You can use RBF (Replace-By-Fee) or CPFP (Child-Pays-for-Parent)
                to increase the fee and speed up confirmation.
              </Alert>

              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setActiveTab(TABS.RBF)}
                  sx={{ mr: 2 }}
                >
                  Use RBF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setActiveTab(TABS.CPFP)}
                >
                  Use CPFP
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === TABS.RBF && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Replace-By-Fee (RBF)
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Replace your transaction with a new one with a higher fee. This
                works if your transaction has RBF enabled.
              </Alert>

              <Box mt={3}>
                <Typography variant="body1" gutterBottom>
                  Current Fee Rate: {selectedTx.feeRate.toFixed(2)} sats/vB
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Suggested Fee Rate: {(selectedTx.feeRate * 1.5).toFixed(2)}{" "}
                  sats/vB
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Original Fee: {selectedTx.fee} sats
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Estimated New Fee: {Math.round(selectedTx.fee * 1.5)} sats
                </Typography>

                <Button variant="contained" color="primary" sx={{ mt: 2 }}>
                  Create RBF Transaction
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === TABS.CPFP && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Child-Pays-for-Parent (CPFP)
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Create a new transaction that spends an output from your
                unconfirmed transaction, with a high enough fee to "pull" the
                parent along.
              </Alert>

              <Box mt={3}>
                <Typography variant="body1" gutterBottom>
                  Parent Transaction Fee: {selectedTx.fee} sats
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Parent Size: {selectedTx.size} vBytes
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Suggested Child Fee: {Math.round(selectedTx.fee * 2)} sats
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Estimated Combined Fee Rate:{" "}
                  {(selectedTx.feeRate * 1.8).toFixed(2)} sats/vB
                </Typography>

                <Button variant="contained" color="primary" sx={{ mt: 2 }}>
                  Create CPFP Transaction
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Dummy pending transactions for the UI demo
  const dummyTransactions = [
    {
      txid: "1a2b3c4d5e6f7g8h9i0j",
      time: "10 minutes ago",
      size: 245,
      fee: "2450",
      feeRate: 10,
      confirmations: 0,
    },
    {
      txid: "9i8h7g6f5e4d3c2b1a0",
      time: "25 minutes ago",
      size: 320,
      fee: "1600",
      feeRate: 5,
      confirmations: 0,
    },
  ];

  const txsToDisplay =
    pendingTransactions.length > 0 ? pendingTransactions : dummyTransactions;

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Transaction Accelerator
        </Typography>

        <Alert severity="info" className={classes.infoBox}>
          <AlertTitle>Fee Acceleration</AlertTitle>
          If your transaction is taking too long to confirm, you can use the
          options below to accelerate it by increasing the fee.
        </Alert>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Pending Transactions
          </Typography>

          {txsToDisplay.length === 0 ? (
            <Alert severity="info">
              You don't have any pending transactions that can be accelerated.
            </Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Size (vBytes)</TableCell>
                  <TableCell>Fee (sats)</TableCell>
                  <TableCell>Fee Rate (sats/vB)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txsToDisplay.map((tx) => (
                  <TableRow
                    key={tx.txid}
                    className={
                      selectedTx && selectedTx.txid === tx.txid
                        ? classes.selectedRow
                        : ""
                    }
                    onClick={() => handleTransactionSelect(tx)}
                  >
                    <TableCell className={classes.tableCell}>
                      {tx.txid.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{tx.time}</TableCell>
                    <TableCell>{tx.size}</TableCell>
                    <TableCell>{tx.fee} sats</TableCell>
                    <TableCell>{tx.feeRate.toFixed(2)} sats/vB</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<SpeedIcon />}
                        className={classes.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTransactionSelect(tx);
                        }}
                      >
                        Accelerate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        {renderContent()}
      </CardContent>
    </Card>
  );
};

WalletAccelerator.propTypes = {
  pendingTransactions: PropTypes.arrayOf(
    PropTypes.shape({
      txid: PropTypes.string.isRequired,
      time: PropTypes.string.isRequired,
      size: PropTypes.number.isRequired,
      fee: PropTypes.string.isRequired,
      feeRate: PropTypes.number.isRequired,
    }),
  ),
  client: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  network: PropTypes.string.isRequired,
  getBlockchainClient: PropTypes.func.isRequired,
  requiredSigners: PropTypes.number.isRequired,
  totalSigners: PropTypes.number.isRequired,
  addressType: PropTypes.string.isRequired,
};

WalletAccelerator.defaultProps = {
  pendingTransactions: [], // Default to empty array
};

function mapStateToProps(state) {
  return {
    pendingTransactions: state.wallet.pendingTransactions || [],
    client: state.client,
    network: state.settings.network,
    requiredSigners: state.settings.requiredSigners,
    totalSigners: state.settings.totalSigners,
    addressType: state.settings.addressType,
  };
}

const mapDispatchToProps = {
  getBlockchainClient: updateBlockchainClient,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletAccelerator);
