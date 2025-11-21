/* global ethers */

// 切面切割操作类型枚举
const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

// 从ABI获取函数选择器
function getSelectors(contract) {
  // ethers v6: 使用 contract.interface.fragments 而不是 contract.interface.functions
  const fragments = contract.interface.fragments || [];
  const signatures = fragments
    .filter((fragment) => fragment.type === "function")
    .map((fragment) => fragment.format("sighash"));

  const selectors = signatures.reduce((acc, val) => {
    if (val !== "init(bytes)") {
      acc.push(contract.interface.getFunction(val).selector);
    }
    return acc;
  }, []);
  selectors.contract = contract;
  selectors.remove = remove; // 添加移除函数
  selectors.get = get; // 添加获取函数
  return selectors;
}

// 从函数签名获取函数选择器
function getSelector(func) {
  const abiInterface = new ethers.Interface([func]);
  return abiInterface.getFunction(func).selector;
}

// 与getSelectors一起使用，从选择器数组中移除选择器
// functionNames参数是函数签名的数组
function remove(functionNames) {
  const selectors = this.filter((v) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getFunction(functionName).selector) {
        return false;
      }
    }
    return true;
  });
  selectors.contract = this.contract;
  selectors.remove = this.remove;
  selectors.get = this.get;
  return selectors;
}

// 与getSelectors一起使用，从选择器数组中获取选择器
// functionNames参数是函数签名的数组
function get(functionNames) {
  const selectors = this.filter((v) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getFunction(functionName).selector) {
        return true;
      }
    }
    return false;
  });
  selectors.contract = this.contract;
  selectors.remove = this.remove;
  selectors.get = this.get;
  return selectors;
}

// 使用签名数组移除选择器
function removeSelectors(selectors, signatures) {
  const iface = new ethers.Interface(signatures.map((v) => "function " + v));
  const removeSelectors = signatures.map((v) => iface.getFunction(v).selector);
  selectors = selectors.filter((v) => !removeSelectors.includes(v));
  return selectors;
}

// 在diamondLoupeFacet.facets()的返回值中查找特定地址的位置
function findAddressPositionInFacets(facetAddress, facets) {
  for (let i = 0; i < facets.length; i++) {
    if (facets[i].facetAddress === facetAddress) {
      return i;
    }
  }
}

// 导出所有函数
exports.getSelectors = getSelectors;
exports.getSelector = getSelector;
exports.FacetCutAction = FacetCutAction;
exports.remove = remove;
exports.removeSelectors = removeSelectors;
exports.findAddressPositionInFacets = findAddressPositionInFacets;
