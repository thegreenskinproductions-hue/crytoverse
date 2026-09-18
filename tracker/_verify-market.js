const m = require("./market");
m.getMarket(15)
  .then((x) => {
    console.log("real:", x.real.length, "ours:", x.ours.length);
    console.log("TOP 8 LEADERBOARD:");
    x.leaderboard.slice(0, 8).forEach((e, i) =>
      console.log(i + 1, e.symbol.padEnd(10), e.side.padEnd(6), "24h=" + e.chg24h, "score=" + e.score, e.bias)
    );
    console.log("--- ours:");
    x.ours.forEach((e) => console.log("  ", e.symbol, e.source, "price=" + e.price, "24h=" + e.chg24h));
    console.log("--- movers24 top 5:");
    x.movers24.slice(0, 5).forEach((e) => console.log("  ", e.symbol, e.chg24h));
  })
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
