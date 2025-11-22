import { MetaFunction } from "@remix-run/node";
import { getPageMeta } from "@/utils/seo";

export const meta: MetaFunction = () => {
    const rootSeoTags = getPageMeta();
    const pageSpecificTags = [{ title: "AI Tools - Zibit" }];
    return [...rootSeoTags, ...pageSpecificTags];
};

export default function AIPage() {
    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center">AI Tools</h1>
                <div className="bg-neutral-800 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
                    <p className="text-neutral-400 text-lg">
                        Advanced AI-powered trading analysis and insights are coming to Zibit.
                    </p>
                    <p className="text-neutral-400 mt-4">
                        Stay tuned for market analysis, risk assessment, and intelligent trading suggestions.
                    </p>
                </div>
            </div>
        </div>
    );
}
