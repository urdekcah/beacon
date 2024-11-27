# =============================================================================
# Copyright (c) 2024, urdekcah
# All rights reserved.
#
# This software is released under the MIT License.
# https://opensource.org/licenses/MIT
# =============================================================================
import os
import sys
import re
from typing import Dict, Optional

class DotEnv:
  @staticmethod
  def _clean_value(value: str) -> str:
    value = value.split('#', 1)[0].strip()
    
    if (value.startswith('"') and value.endswith('"')) or \
       (value.startswith("'") and value.endswith("'")):
      value = value[1:-1]
    
    return value.strip()
  
  @classmethod
  def load(cls, env_path: Optional[str] = None) -> Dict[str, str]:
    if env_path is None:
      env_path = '.env'
    
    if not os.path.exists(env_path):
      return {}

    env_vars = {}
    try:
      with open(env_path, 'r', encoding='utf-8') as file:
        current_key = None
        current_value = []
        
        for line in file:
          line = line.strip()
          
          if not line or line.startswith('#'):
            continue
          
          if current_key and (line.startswith('"') or line.startswith("'")):
            current_value.append(line)
            continue
          
          match = re.match(r'^([^=\s]+)\s*=\s*(.+)$', line)
          if match:
            if current_key:
              cleaned_value = cls._clean_value(' '.join(current_value))
              env_vars[current_key] = cleaned_value
              current_value = []
            
            current_key = match.group(1)
            current_value = [match.group(2)]
        
        if current_key:
          cleaned_value = cls._clean_value(' '.join(current_value))
          env_vars[current_key] = cleaned_value
    
    except (IOError, PermissionError) as e:
      print(f"Error reading .env file: {e}", file=sys.stderr)
      return {}
    
    for key, value in env_vars.items():
      os.environ.setdefault(key, value)
    
    return env_vars
  
  @staticmethod
  def get(key: str, default: Optional[str] = None) -> Optional[str]:
    return os.environ.get(key, default)