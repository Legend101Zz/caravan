// apps/coordinator/src/components/Wallet/TransactionsTab.tsx

import React, { useState, useEffect, useCallback } from "react";
import { connect } from "react-redux";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Collapse,
  Paper,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import SpeedIcon from "@mui/icons-material/Speed";
import { BlockchainClient } from "@caravan/clients";
import { blockExplorerTransactionURL, Network } from "@caravan/bitcoin";
import { updateBlockchainClient } from "../../actions/clientActions";
import { TransactionTable } from "./TransactionsTable";
import TransactionDetails from "./TransactionDetails";
import TransactionAccelerationPanel from "./TransactionAccelerationPanel";

// How are Transaction should look like
interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: any[]; // Input vector
  vout: any[]; // Output vector
  weight: number;
  status: {
    confirmed: boolean;
    blockTime?: number;
    blockHeight?: number;
  };
  size: number;
  fee: number;
  network?: string;
}

interface TransactionsTabProps {
  network: Network;
  getBlockchainClient: () => Promise<BlockchainClient>;
  deposits: {
    nodes: Record<string, any>;
  };
  change: {
    nodes: Record<string, any>;
  };
  client: {
    type: string;
    blockchainClient?: BlockchainClient;
  };
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({
  network,
  getBlockchainClient,
  deposits,
  change,
  client,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("blockTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [acceleratingTx, setAcceleratingTx] = useState<Transaction | null>(
    null,
  );

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const blockchainClient = await getBlockchainClient();
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      // Get unique transaction IDs from UTXOs
      const txids = new Set<string>();
      [
        ...Object.values(deposits.nodes),
        ...Object.values(change.nodes),
      ].forEach((node) => {
        if (node.utxos) {
          node.utxos.forEach((utxo: { txid: string }) => {
            txids.add(utxo.txid);
          });
        }
      });

      // Fetch transaction details in parallel
      const txDetails = await Promise.all(
        Array.from(txids).map(async (txid) => {
          try {
            const tx = await blockchainClient.getTransaction(txid);
            // Add network to transaction object
            return { ...tx, network };
          } catch (err) {
            console.error(`Error fetching tx ${txid}:`, err);
            return null;
          }
        }),
      );
      setTransactions(txDetails.filter((tx): tx is Transaction => tx !== null));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [getBlockchainClient, deposits.nodes, change.nodes, network]);

  // Initial loading
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle sorting
  const handleSort = (property: string) => {
    const isAsc = sortBy === property && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(property);
  };

  const handleTransactionClick = useCallback(
    (txid: string) => {
      // Check if user is using a private node
      const isPrivateNode = client.type === "private";

      if (isPrivateNode) {
        // If using private node, warn about privacy implications
        const confirmed = window.confirm(
          "Opening in a block explorer may expose your wallet activity to third parties. Continue?",
        );
        if (!confirmed) return;
      }
      // Determine which block explorer to use based on the blockchain client type
      let explorerUrl;

      if (client.blockchainClient && client.blockchainClient.type) {
        const clientType = client.blockchainClient.type;

        switch (clientType) {
          case "mempool":
            // Use mempool.space explorer
            explorerUrl = `https://${network === "mainnet" ? "" : "testnet."}mempool.space/tx/${txid}`;
            break;

          case "blockstream":
            // Use blockstream.info explorer
            explorerUrl = `https://blockstream.info/${network === "mainnet" ? "" : "testnet/"}tx/${txid}`;
            break;

          default:
            // Fall back to the default explorer
            explorerUrl = blockExplorerTransactionURL(txid, network);
        }
      } else {
        // If no blockchain client specified, use default
        explorerUrl = blockExplorerTransactionURL(txid, network);
      }

      window.open(explorerUrl, "_blank");
    },
    [network, client],
  );

  // Filter and sort transactions
  const getSortedTransactions = useCallback(
    (txs: Transaction[]) => {
      return [...txs].sort((a, b) => {
        // Handle different sorting properties
        let comparison = 0;
        switch (sortBy) {
          case "blockTime":
            comparison = (a.status.blockTime || 0) - (b.status.blockTime || 0);
            break;
          case "size":
            comparison = a.size - b.size;
            break;
          case "fee":
            comparison = (a.fee || 0) - (b.fee || 0);
            break;
          default:
            return 0;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
    },
    [sortBy, sortDirection],
  );

  // Split and sort transactions
  const pendingTxs = getSortedTransactions(
    transactions.filter((tx) => !tx.status.confirmed),
  );
  const confirmedTxs = getSortedTransactions(
    transactions.filter((tx) => tx.status.confirmed),
  );

  // Handle row click
  const handleRowClick = (txid: string) => {
    if (expandedTx === txid && !acceleratingTx) {
      setExpandedTx(null);
    } else {
      setExpandedTx(txid);
      setAcceleratingTx(null);
    }
  };

  // Handle acceleration button click
  const handleAccelerateClick = (tx: Transaction) => {
    setExpandedTx(tx.txid);
    setAcceleratingTx(tx);
  };

  // Handle completion of acceleration
  const handleAccelerationComplete = () => {
    setAcceleratingTx(null);
    setExpandedTx(null);
    fetchTransactions(); // Refresh after acceleration
  };

  return (
    <div>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Transactions</Typography>
        <Tooltip title="Refresh transactions">
          <IconButton onClick={fetchTransactions} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Typography color="error" gutterBottom>
          Error: {error}
        </Typography>
      )}

      <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <span>Pending</span>
              <Chip
                label={pendingTxs.length}
                size="small"
                color={pendingTxs.length > 0 ? "primary" : "default"}
              />
            </Box>
          }
        />
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <span>Confirmed</span>
              <Chip label={confirmedTxs.length} size="small" />
            </Box>
          }
        />
      </Tabs>

      <Box mt={2}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TransactionTable
              transactions={tabValue === 0 ? pendingTxs : confirmedTxs}
              onSort={handleSort}
              sortBy={sortBy}
              sortDirection={sortDirection}
              network={network}
              onClickTransaction={handleTransactionClick}
              expandedTx={expandedTx}
              onRowClick={handleRowClick}
              onAccelerateClick={handleAccelerateClick}
            />

            {/* Transaction details with acceleration panel */}
            {expandedTx && (
              <Collapse in={!!expandedTx} timeout="auto">
                <Paper sx={{ mt: 1, mb: 3, overflow: "hidden" }}>
                  {acceleratingTx && expandedTx === acceleratingTx.txid ? (
                    <TransactionAccelerationPanel
                      transaction={acceleratingTx}
                      onClose={() => setAcceleratingTx(null)}
                      onComplete={handleAccelerationComplete}
                    />
                  ) : (
                    <TransactionDetails
                      transaction={transactions.find(
                        (tx) => tx.txid === expandedTx,
                      )}
                      network={network}
                      onAccelerate={(tx) => setAcceleratingTx(tx)}
                    />
                  )}
                </Paper>
              </Collapse>
            )}
          </>
        )}
      </Box>
    </div>
  );
};

const mapStateToProps = (state: any) => ({
  network: state.settings.network,
  deposits: state.wallet.deposits,
  change: state.wallet.change,
  client: state.client,
});

const mapDispatchToProps = {
  getBlockchainClient: updateBlockchainClient,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionsTab);
