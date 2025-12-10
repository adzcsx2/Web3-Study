import os
import re

# periphery 目录路径
periphery_dir = r"contracts\contract\swap\periphery"

# 遍历所有 .sol 文件
for root, dirs, files in os.walk(periphery_dir):
    for file in files:
        if file.endswith(".sol"):
            file_path = os.path.join(root, file)

            # 读取文件内容
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 替换 pragma solidity =0.8.15 为 ^0.8.20
            new_content = re.sub(
                r"pragma solidity =0\.8\.15;", "pragma solidity ^0.8.20;", content
            )

            # 写回文件
            if new_content != content:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated: {file_path}")

print("Done!")
