import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SpeedIcon from "@mui/icons-material/Speed";
import RBFOptions from "./RBFOptions";
import CPFPOptions from "./CPFPOptions";

const TransactionAccelerationPanel = ({ transaction, onClose, onComplete }) => {
  const [method, setMethod] = useState(0); // 0 for RBF, 1 for CPFP

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h6"
          component="h2"
          display="flex"
          alignItems="center"
        >
          <SpeedIcon sx={{ mr: 1, color: "primary.main" }} />
          Transaction Acceleration
        </Typography>
        <IconButton onClick={onClose} edge="end" aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box mb={3}>
        <Tabs
          value={method}
          onChange={(_, val) => setMethod(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Replace-By-Fee (RBF)" />
          <Tab label="Child-Pays-For-Parent (CPFP)" />
        </Tabs>
      </Box>

      {method === 0 ? (
        <RBFOptions
          transaction={transaction}
          network={transaction.network || "testnet"}
          onComplete={onComplete}
        />
      ) : (
        <CPFPOptions
          transaction={transaction}
          network={transaction.network || "testnet"}
          onComplete={onComplete}
        />
      )}
    </Box>
  );
};

export default TransactionAccelerationPanel;
