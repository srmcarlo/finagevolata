import { readFileSync } from "node:fs";
import { resolve } from "node:path";

(() => {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {}
})();

import { ViesCciaaProvider } from "../lib/cciaa/vies";
import { OpenApiCciaaProvider } from "../lib/cciaa/openapi";
import { OpenAiAtecoProvider } from "../lib/cciaa/openai-ateco";
import { ChainedCciaaProvider } from "../lib/cciaa/chain";

const samples = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["00488410010", "12485671007", "01615855215", "00159560366"];

async function run() {
  const vies = new ViesCciaaProvider();
  const openapi = new OpenApiCciaaProvider();
  const openaiAteco = new OpenAiAtecoProvider();

  const providers = [];
  if (process.env.OPENAPI_IT_TOKEN) providers.push(openapi);
  providers.push(vies);
  if (process.env.OPENAI_API_KEY) providers.push(openaiAteco);
  const chain = new ChainedCciaaProvider(providers);

  for (const vat of samples) {
    console.log(`\n=== P.IVA ${vat} ===`);
    console.log("VIES   :", await vies.lookup(vat));
    if (process.env.OPENAPI_IT_TOKEN) {
      console.log("OpenAPI:", await openapi.lookup(vat));
    } else {
      console.log("OpenAPI: (skipped, no OPENAPI_IT_TOKEN)");
    }
    console.log("CHAIN  :", await chain.lookup(vat));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
