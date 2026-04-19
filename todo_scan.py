import os
glob_pattern = '**/*.py'
for file in glob.glob(glob_pattern, recursive=True):
    with open(file, 'r') as f:
        content = f.read()
        if 'TODO' in content:
            print(f"Found TODO in {file}")