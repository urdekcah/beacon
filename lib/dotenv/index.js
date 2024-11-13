const fs = require('fs');
const path = require('path');

/**
 * Fishydino .env file loader.
 * @author urdekcah
 */
class DotEnv {
  /**
   * Loads environment variables from a .env file.
   * @param {string} [filePath='.env'] - Path to the .env file (relative to the current working directory).
   * @param {boolean} [throwOnError=false] - Determines whether to throw an error or just log a warning if the .env file is not found.
   * @returns {void}
   */
  static load(filePath = '.env', throwOnError = false) {
    const fullPath = path.resolve(process.cwd(), filePath);

    try {
      const envData = fs.readFileSync(fullPath, 'utf8');
      this.parse(envData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        if (throwOnError) {
          throw new Error(`No .env file found at ${fullPath}`);
        } else {
          console.warn(`No .env file found at ${fullPath}`);
        }
      } else {
        console.error('Error loading .env file:', error);
        if (throwOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Parses environment variables from a string.
   * @param {string} envData - The contents of the .env file as a string.
   * @returns {void}
   */
  static parse(envData) {
    const lines = envData.trim().split('\n');

    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length < 2) {
        continue;
      }

      const key = this.trimQuotes(parts.shift().trim());
      const value = this.trimQuotes(parts.join('=').trim());

      if (key && value) {
        process.env[key] = value;
      }
    }
  }

  /**
   * Trims leading and trailing quotes from a string.
   * @param {string} str - The input string to be trimmed.
   * @returns {string} The trimmed string.
   */
  static trimQuotes(str) {
    return str.replace(/^['"]|['"]$/g, '');
  }

  /**
   * Sets an environment variable.
   * @param {string} key - The key of the environment variable.
   * @param {string} value - The value of the environment variable.
   * @returns {void}
   */
  static set(key, value) {
    process.env[key] = value;
  }

  /**
   * Gets the value of an environment variable.
   * @param {string} key - The key of the environment variable.
   * @param {string} [defaultValue] - The default value to return if the environment variable is not set.
   * @returns {string|undefined} The value of the environment variable or the default value if not set.
   */
  static get(key, defaultValue) {
    return process.env[key] || defaultValue;
  }

  /**
   * Checks if an environment variable is set.
   * @param {string} key - The key of the environment variable.
   * @returns {boolean} True if the environment variable is set, false otherwise.
   */
  static has(key) {
    return typeof process.env[key] !== 'undefined';
  }

  /**
   * Dumps all environment variables to a string.
   * @returns {string} The environment variables as a string.
   */
  static dump() {
    return Object.entries(process.env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }
}

module.exports = DotEnv;