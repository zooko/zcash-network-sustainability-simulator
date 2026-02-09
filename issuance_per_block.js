function issuance_per_block(blockheight) {
    // === Constants (with source references) ===

    // amount.h:        static const CAmount COIN = 100000000;
    // params.cpp:      CAmount nSubsidy = 12.5 * COIN;
    const MAX_BLOCK_SUBSIDY = 1250000000n;

    // chainparams.cpp: consensus.nSubsidySlowStartInterval = 20000;
    const SLOW_START_INTERVAL = 20000;
    // params.h:        SubsidySlowStartShift() { return nSubsidySlowStartInterval / 2; }
    const SLOW_START_SHIFT = 10000;
    // theoretical.py:  SlowStartRate = exact_div(MaxBlockSubsidy, SlowStartInterval)
    // params.h comment: "Needs to evenly divide MAX_SUBSIDY to avoid rounding errors"
    const SLOW_START_RATE = 62500n;

    // chainparams.cpp: vUpgrades[Consensus::UPGRADE_BLOSSOM].nActivationHeight = 653600;
    const BLOSSOM_ACTIVATION_HEIGHT = 653600;
    // params.h:        PRE_BLOSSOM_POW_TARGET_SPACING = 150; POST = 75; RATIO = 150/75
    const BLOSSOM_POW_TARGET_SPACING_RATIO = 2n;

    // params.h:        PRE_BLOSSOM_HALVING_INTERVAL = 840000
    const PRE_BLOSSOM_HALVING_INTERVAL = 840000;
    // params.h macro:  POST_BLOSSOM_HALVING_INTERVAL = PRE * RATIO
    const POST_BLOSSOM_HALVING_INTERVAL = 1680000n;

    const h = BigInt(blockheight);

    // === Slow start (params.cpp GetBlockSubsidy, theoretical.py BlockSubsidy) ===

    // C++: nSubsidy /= nSubsidySlowStartInterval; nSubsidy *= nHeight;
    // Py:  SlowStartRate * height
    if (blockheight < SLOW_START_SHIFT) {
        return SLOW_START_RATE * h;
    }

    // C++: nSubsidy /= nSubsidySlowStartInterval; nSubsidy *= (nHeight+1);
    // Py:  SlowStartRate * (height + 1)
    if (blockheight < SLOW_START_INTERVAL) {
        return SLOW_START_RATE * (h + 1n);
    }

    // === Halving index (params.cpp Halving(), theoretical.py Halving()) ===

    let halvings;
    if (blockheight >= BLOSSOM_ACTIVATION_HEIGHT) {
        // C++: scaledHalvings = (blossomActivationHeight - SubsidySlowStartShift())
        //        * BLOSSOM_POW_TARGET_SPACING_RATIO + (nHeight - blossomActivationHeight);
        //      return scaledHalvings / nPostBlossomSubsidyHalvingInterval;
        // Py:  div2(BlossomActivationHeight - SlowStartShift, PreBlossomHalvingInterval,
        //           height - BlossomActivationHeight, PostBlossomHalvingInterval)
        const scaledHalvings =
            BigInt(BLOSSOM_ACTIVATION_HEIGHT - SLOW_START_SHIFT) * BLOSSOM_POW_TARGET_SPACING_RATIO
            + (h - BigInt(BLOSSOM_ACTIVATION_HEIGHT));
        halvings = Number(scaledHalvings / POST_BLOSSOM_HALVING_INTERVAL);
    } else {
        // C++: (nHeight - SubsidySlowStartShift()) / nPreBlossomSubsidyHalvingInterval
        // Py:  (height - SlowStartShift) // PreBlossomHalvingInterval
        halvings = Math.floor((blockheight - SLOW_START_SHIFT) / PRE_BLOSSOM_HALVING_INTERVAL);
    }

    // C++: if (halvings >= 64) return 0;
    if (halvings >= 64) return 0n;

    // === Block subsidy (params.cpp GetBlockSubsidy, theoretical.py BlockSubsidy) ===

    if (blockheight >= BLOSSOM_ACTIVATION_HEIGHT) {
        // C++: (nSubsidy / BLOSSOM_POW_TARGET_SPACING_RATIO) >> halvings
        // Py:  MaxBlockSubsidy // (BlossomPoWTargetSpacingRatio << Halving(height))
        return (MAX_BLOCK_SUBSIDY / BLOSSOM_POW_TARGET_SPACING_RATIO) >> BigInt(halvings);
    } else {
        // C++: nSubsidy >> halvings
        // Py:  MaxBlockSubsidy // (1 << Halving(height))
        return MAX_BLOCK_SUBSIDY >> BigInt(halvings);
    }
}
