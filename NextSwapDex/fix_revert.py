import os
import re

# Directory containing the contracts
contracts_dir = r"E:\ReactWorkplace\Web3-Study\NextSwapDex\contracts"

# Pattern to match revert statements without space
pattern = r'revert([A-Z][a-zA-Z0-9]*)\(\);'

# Walk through all .sol files
for root, dirs, files in os.walk(contracts_dir):
    for file in files:
        if file.endswith('.sol'):
            file_path = os.path.join(root, file)

            # Read the file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Replace all revert statements
            new_content = re.sub(pattern, r'revert \1();', content)

            # Write back if changed
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {file_path}")