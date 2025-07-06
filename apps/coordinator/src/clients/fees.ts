import { BlockchainClient } from "@caravan/clients";
import { useQuery } from "@tanstack/react-query";
import { useGetClient } from "hooks/client";

enum FeePriority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Confirmation targets for fee estimation in blocks
 *
 * These values align with common confirmation targets used generally:
 * - HIGH: Next block (10 minutes)
 * - MEDIUM: ~3 blocks (30 minutes)
 * - LOW: ~6 blocks (1 hour)
 *
 * @see https://gist.github.com/morcos/d3637f015bc4e607e1fd10d8351e9f41
 */
export const CONFIRMATION_TARGETS = {
  [FeePriority.HIGH]: 1, // Next block (~10 min)
  [FeePriority.MEDIUM]: 3, // Within Next 3 blocks ~30 min
  [FeePriority.LOW]: 6, // Within Next 6 blocks ~1 hour
};

const feeEstimateKeys = {
  all: ["fees"] as const,
  feeEstimate: (priority: FeePriority) =>
    [...feeEstimateKeys.all, priority] as const,
};

const useGetFeeEstimate = async (
  priority: FeePriority,
  blockchainClient: BlockchainClient,
) => {
  return await blockchainClient.getFeeEstimate(CONFIRMATION_TARGETS[priority]);
};

export const useFeeEstimate = (priority: FeePriority) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: feeEstimateKeys.feeEstimate(priority),
    queryFn: () => useGetFeeEstimate(priority, blockchainClient),
    enabled: !!blockchainClient,
  });
};

export const useFeeEstimates = () => {
  const highQuery = useFeeEstimate(FeePriority.HIGH);
  const mediumQuery = useFeeEstimate(FeePriority.MEDIUM);
  const lowQuery = useFeeEstimate(FeePriority.LOW);

  const isLoading =
    highQuery.isLoading || mediumQuery.isLoading || lowQuery.isLoading;
  const error = highQuery.error || mediumQuery.error || lowQuery.error;

  const feeEstimates = {
    [FeePriority.HIGH]: highQuery.data,
    [FeePriority.MEDIUM]: mediumQuery.data,
    [FeePriority.LOW]: lowQuery.data,
  };

  return {
    data: feeEstimates,
    isLoading,
    error,
  };
};
