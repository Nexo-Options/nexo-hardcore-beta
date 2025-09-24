import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const USDC = await get("USDC")
  const NEXO = await get("NEXO")

  await deploy("NexoStakeAndCover", {
    from: deployer,
    log: true,
    args: [NEXO.address, USDC.address],
  })
}

deployment.tags = ["test-single", "stake-and-cover"]
deployment.dependencies = ["single-tokens"]

export default deployment
