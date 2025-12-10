// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import {INextswapV3PoolImmutables} from "./pool/INextswapV3PoolImmutables.sol";
import {INextswapV3PoolState} from "./pool/INextswapV3PoolState.sol";
import {
    INextswapV3PoolDerivedState
} from "./pool/INextswapV3PoolDerivedState.sol";
import {INextswapV3PoolActions} from "./pool/INextswapV3PoolActions.sol";
import {
    INextswapV3PoolOwnerActions
} from "./pool/INextswapV3PoolOwnerActions.sol";
import {INextswapV3PoolErrors} from "./pool/INextswapV3PoolErrors.sol";
import {INextswapV3PoolEvents} from "./pool/INextswapV3PoolEvents.sol";

/// @title The interface for a Nextswap V3 Pool
/// @notice A Nextswap pool facilitates swapping and automated market making between any two assets that strictly conform
/// to the ERC20 specification
/// @dev The pool interface is broken up into many smaller pieces
interface INextswapV3Pool is
    INextswapV3PoolImmutables,
    INextswapV3PoolState,
    INextswapV3PoolDerivedState,
    INextswapV3PoolActions,
    INextswapV3PoolOwnerActions,
    INextswapV3PoolErrors,
    INextswapV3PoolEvents
{}
