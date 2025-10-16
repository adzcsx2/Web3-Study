// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title 通用数组工具库
 * @dev 提供常用的数组操作功能
 */
library AdvancedArrayUtils {
    
    // ==================== uint256 数组工具 ====================
    
    /**
     * @dev 检查数组中是否包含某个元素
     */
    function contains(uint256[] memory arr, uint256 value) internal pure returns (bool) {
        return indexOf(arr, value) != type(uint256).max;
    }
    
    /**
     * @dev 查找元素索引，不存在返回 type(uint256).max
     */
    function indexOf(uint256[] memory arr, uint256 value) internal pure returns (uint256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    /**
     * @dev 移除数组中第一个匹配的元素
     */
    function remove(uint256[] storage arr, uint256 value) internal returns (bool) {
        uint256 index = indexOf(arr, value);
        if (index == type(uint256).max) {
            return false;
        }
        removeAt(arr, index);
        return true;
    }
    
    /**
     * @dev 移除指定索引的元素（保持顺序）
     */
    function removeAt(uint256[] storage arr, uint256 index) internal {
        require(index < arr.length, "Index out of bounds");
        for (uint256 i = index; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }
    
    /**
     * @dev 高效移除指定索引的元素（不保持顺序）
     */
    function removeAtFast(uint256[] storage arr, uint256 index) internal {
        require(index < arr.length, "Index out of bounds");
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }
    
    /**
     * @dev 去重（保持原顺序）
     */
    function unique(uint256[] memory arr) internal pure returns (uint256[] memory) {
        if (arr.length == 0) return arr;
        
        uint256[] memory temp = new uint256[](arr.length);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < arr.length; i++) {
            bool isDuplicate = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (temp[j] == arr[i]) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                temp[uniqueCount] = arr[i];
                uniqueCount++;
            }
        }
        
        // 创建正确大小的返回数组
        uint256[] memory result = new uint256[](uniqueCount);
        for (uint256 i = 0; i < uniqueCount; i++) {
            result[i] = temp[i];
        }
        return result;
    }
    
    /**
     * @dev 数组排序（升序）
     */
    function sort(uint256[] memory arr) internal pure returns (uint256[] memory) {
        if (arr.length <= 1) return arr;
        
        // 快速排序
        _quickSort(arr, 0, int256(arr.length - 1));
        return arr;
    }
    
    /**
     * @dev 快速排序内部实现
     */
    function _quickSort(uint256[] memory arr, int256 left, int256 right) private pure {
        if (left < right) {
            int256 pivotIndex = _partition(arr, left, right);
            _quickSort(arr, left, pivotIndex - 1);
            _quickSort(arr, pivotIndex + 1, right);
        }
    }
    
    /**
     * @dev 分区函数
     */
    function _partition(uint256[] memory arr, int256 left, int256 right) private pure returns (int256) {
        uint256 pivot = arr[uint256(right)];
        int256 i = left - 1;
        
        for (int256 j = left; j < right; j++) {
            if (arr[uint256(j)] <= pivot) {
                i++;
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
            }
        }
        (arr[uint256(i + 1)], arr[uint256(right)]) = (arr[uint256(right)], arr[uint256(i + 1)]);
        return i + 1;
    }
    
    /**
     * @dev 数组求和
     */
    function sum(uint256[] memory arr) internal pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < arr.length; i++) {
            total += arr[i];
        }
        return total;
    }
    
    /**
     * @dev 数组平均值
     */
    function average(uint256[] memory arr) internal pure returns (uint256) {
        require(arr.length > 0, "Array is empty");
        return sum(arr) / arr.length;
    }
    
    /**
     * @dev 查找最大值
     */
    function max(uint256[] memory arr) internal pure returns (uint256) {
        require(arr.length > 0, "Array is empty");
        uint256 maxValue = arr[0];
        for (uint256 i = 1; i < arr.length; i++) {
            if (arr[i] > maxValue) {
                maxValue = arr[i];
            }
        }
        return maxValue;
    }
    
    /**
     * @dev 查找最小值
     */
    function min(uint256[] memory arr) internal pure returns (uint256) {
        require(arr.length > 0, "Array is empty");
        uint256 minValue = arr[0];
        for (uint256 i = 1; i < arr.length; i++) {
            if (arr[i] < minValue) {
                minValue = arr[i];
            }
        }
        return minValue;
    }
    
    // ==================== address 数组工具 ====================
    
    function contains(address[] memory arr, address value) internal pure returns (bool) {
        return indexOfAddress(arr, value) != type(uint256).max;
    }
    
    function indexOfAddress(address[] memory arr, address value) internal pure returns (uint256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    function removeAddress(address[] storage arr, address value) internal returns (bool) {
        uint256 index = indexOfAddress(arr, value);
        if (index == type(uint256).max) {
            return false;
        }
        removeAddressAt(arr, index);
        return true;
    }
    
    function removeAddressAt(address[] storage arr, uint256 index) internal {
        require(index < arr.length, "Index out of bounds");
        for (uint256 i = index; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }
    
    function removeAddressAtFast(address[] storage arr, uint256 index) internal {
        require(index < arr.length, "Index out of bounds");
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }
    
    // ==================== bytes32 数组工具 ====================
    
    function contains(bytes32[] memory arr, bytes32 value) internal pure returns (bool) {
        return indexOfBytes32(arr, value) != type(uint256).max;
    }
    
    function indexOfBytes32(bytes32[] memory arr, bytes32 value) internal pure returns (uint256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    // ==================== 通用工具 ====================
    
    /**
     * @dev 检查数组是否为空
     */
    function isEmpty(uint256[] memory arr) internal pure returns (bool) {
        return arr.length == 0;
    }
    
    function isEmpty(address[] memory arr) internal pure returns (bool) {
        return arr.length == 0;
    }
    
    function isEmpty(bytes32[] memory arr) internal pure returns (bool) {
        return arr.length == 0;
    }
    
    /**
     * @dev 清空storage数组
     */
    function clear(uint256[] storage arr) internal {
        while (arr.length > 0) {
            arr.pop();
        }
    }
    
    function clear(address[] storage arr) internal {
        while (arr.length > 0) {
            arr.pop();
        }
    }
    
    function clear(bytes32[] storage arr) internal {
        while (arr.length > 0) {
            arr.pop();
        }
    }
}