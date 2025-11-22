import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";
import { MetaFunction } from "@remix-run/node";
import { API } from "@orderly.network/types";
import { TradingPage } from "@orderly.network/trading";
import { updateSymbol } from "@/utils/storage";
import { formatSymbol, generatePageTitle } from "@/utils/utils";
import { useOrderlyConfig } from "@/utils/config";
import { getPageMeta } from "@/utils/seo";
import { ClientOnlyAIChat } from "@/components/ai/ClientOnlyAIChat";
import { AIProvider } from "@/components/ai/AIProvider";
import { useAccount } from "@orderly.network/hooks";

export const meta: MetaFunction = ({ params }) => {
  const rootSeoTags = getPageMeta();
  const pageSpecificTags = [{ title: generatePageTitle(formatSymbol(params.symbol!)) }];
  return [...rootSeoTags, ...pageSpecificTags];
};

export default function PerpPage() {
  const params = useParams();
  const [symbol, setSymbol] = useState(params.symbol!);
  const config = useOrderlyConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Orderly hooks for AI context
  const { account } = useAccount();

  // Debug logging
  console.log('Account data:', account);
  console.log('Account address:', account?.address);
  console.log('Account userAddress:', account?.userAddress);
  console.log('Account keys:', account ? Object.keys(account) : 'null/undefined');
  console.log('Account values:', account ? Object.values(account) : 'null/undefined');

  // Check if account is connected (multiple ways)
  const isLoggedIn = !!(account?.address || account?.userAddress || account?.accountId);
  const accountAddress = account?.address || account?.userAddress || account?.accountId || null;

  useEffect(() => {
    updateSymbol(symbol);
  }, [symbol]);

  const onSymbolChange = useCallback(
    (data: API.Symbol) => {
      const symbol = data.symbol;
      setSymbol(symbol);

      const searchParamsString = searchParams.toString();
      const queryString = searchParamsString ? `?${searchParamsString}` : '';

      navigate(`/perp/${symbol}${queryString}`);
    },
    [navigate, searchParams]
  );

  return (
    <AIProvider
      symbol={symbol}
      account={accountAddress ? { address: accountAddress, isLoggedIn } : null}
    >
      <TradingPage
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        tradingViewConfig={config.tradingPage.tradingViewConfig}
        sharePnLConfig={config.tradingPage.sharePnLConfig}
      />
      <ClientOnlyAIChat symbol={symbol} />
    </AIProvider>
  );
}
