import {HardhatRuntimeEnvironment} from "hardhat/types"
import {utils} from "ethers"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()
  const NEXO_POOL_ROLE = utils.keccak256(utils.toUtf8Bytes("NEXO_POOL_ROLE"))

  const USDC = await get("USDC")
  const NexoStakeAndCover = await get("NexoStakeAndCover")
  const optionsManger = await get("OptionsManager")

  const params = {
    token: USDC.address,
    manager: optionsManger.address,
    maxReservation: 3600 * 24 * 45,
    insurance: NexoStakeAndCover.address,
    baseAmount: utils.parseUnits("100000", 6),
  }

  const pool = await deploy("NexoOperationalTreasury", {
    from: deployer,
    log: true,
    args: [
      params.token,
      params.manager,
      params.maxReservation,
      params.insurance,
      params.baseAmount,
    ],
  })

  await execute(
    "OptionsManager",
    {log: true, from: deployer},
    "grantRole",
    NEXO_POOL_ROLE,
    pool.address,
  )

  await execute(
    "NexoStakeAndCover",
    {log: true, from: deployer},
    "grantRole",
    NEXO_POOL_ROLE,
    pool.address,
  )
}

deployment.tags = ["test-single", "operational-treasury"]
deployment.dependencies = [
  "single-tokens",
  "options-manager",
  "stake-and-cover",
]

export default deployment
