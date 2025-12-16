// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// NextswapToken errors
error RoleTransferToHolder(); // 不能把角色转给已有该角色的持有者
error RoleNotHeld(); // 该地址未持有该角色
error CannotTransferToSelf(); // 不能将角色转移给自己
error CannotTransferAdminRole(); // 不能转移管理员角色
error CannotRevokeAdminRole(); // 不能撤销管理员角色
error CannotRevokeTimelockRole(); // 不能撤销时间锁角色
error CannotGrantAdminRole(); // 不能授予管理员角色
error CannotRecoverNST(); // 不能恢复NST代币
error UnauthorizedUpgrade(); // 未授权的合约升级

// TeamInspire errors
error InvalidTokenAddress(); // 无效的代币地址
error StartTimeMustBeInFuture(); // 开始时间必须在未来
error ExceedsMaximumTeamAllocation(); // 超过最大团队分配量
error MemberAlreadyExists(); // 成员已存在
error AllocationMustBeGreaterThanZero(); // 分配量必须大于0
error MembersAndAllocationsLengthMismatch(); // 成员地址和分配数量长度不匹配
error NoAllocationFound(); // 未找到分配
error TokensNotYetClaimable(); // 代币尚不可领取
error NoTokensAvailableToClaim(); // 没有可领取的代币

// LiquidityMiningReward errors
error ClaimDeadlineHasNotPassed(); // 领取截止时间未到

// NextswapAirdrop errors
error InvalidRoundNumber(); // 无效的轮次号
error RoundAlreadyExists(); // 轮次已存在
error InvalidTimeRange(); // 无效的时间范围
error InvalidMerkleRoot(); // 无效的Merkle根
error RoundDoesNotExist(); // 轮次不存在
error RoundIsNotActive(); // 轮次未激活
error AirdropNotStarted(); // 空投未开始
error AirdropEnded(); // 空投已结束
error AirdropAlreadyClaimed(); // 空投已领取
error AmountMustBeGreaterThanZeroForAirdrop(); // 空投数量必须大于0
error InvalidMerkleProof(); // 无效的Merkle证明
error CanOnlyClaimForYourself(); // 只能为自己领取
error InsufficientTokenBalanceForClaim(); // 代币余额不足用于领取
error EmptyArrays(); // 数组为空
error ArrayLengthMismatch(); // 数组长度不匹配
error ProofArrayLengthMismatch(); // 证明数组长度不匹配
error InsufficientTotalBalance(); // 总余额不足
error InvalidRecipient(); // 无效的接收者

// PrivateSale errors
error PrivateSaleRoundIsNotActive(); // 私募轮次未激活
error PrivateSaleRoundTimeNotActive(); // 私募轮次时间未激活
error PrivateSaleRoundCapExceeded(); // 超过私募轮次上限
error NoTokensPurchasedInPrivateSale(); // 未购买私募代币
error ClaimPeriodHasNotStarted(); // 领取期未开始
error NoTokensAvailableToClaimInPrivateSale(); // 私募中没有可领取的代币
error InsufficientTokenBalanceInContract(); // 合约中代币余额不足

// NextswapModifiers errors
error DonationPeriodNotActive(); // 捐赠期未激活
error CallerIsZeroAddress(); // 调用者是零地址
error CannotOperateAdminRole(); // 不能操作管理员角色
error CannotOperateTimelockRole(); // 不能操作时间锁角色
error UnauthorizedAdminOrTimelock(); // 必须是管理员或者时间锁角色
error AmountMustBeGreaterThanZeroModifier(); // 数量必须大于0（修饰符）
error InsufficientBalanceModifier(); // 余额不足（修饰符）
error TimeMustBeInFuture(); // 时间必须在未来
error EndTimeMustBeAfterStartTime(); // 结束时间必须晚于开始时间

// LpPools errors
error UnstakeAlreadyRequested(); // 已经请求了解质押
