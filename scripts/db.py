#!/usr/bin/python3
import os
import mysql.connector
from mysql.connector import Error
import re
from colorama import init, Fore, Back, Style
from datetime import datetime
import sys
from dotenv import DotEnv 
import time
import argparse

init()

class SchemaExecutor:
  def __init__(self, config, schema_dir):
    self.config = config
    self.schema_dir = schema_dir
    self.connection = None
    self.cursor = None
    self.no_confirm = False

  @staticmethod
  def get_timestamp():
    return datetime.now().strftime("%H:%M:%S")

  @staticmethod
  def log_info(message):
    timestamp = SchemaExecutor.get_timestamp()
    print(f"{Fore.CYAN}[{timestamp}] ℹ {message}{Style.RESET_ALL}")

  @staticmethod
  def log_success(message):
    timestamp = SchemaExecutor.get_timestamp()
    print(f"{Fore.GREEN}[{timestamp}] ✔ {message}{Style.RESET_ALL}")

  @staticmethod
  def log_error(message):
    timestamp = SchemaExecutor.get_timestamp()
    print(f"{Fore.RED}[{timestamp}] ✖ {message}{Style.RESET_ALL}")

  @staticmethod
  def log_warning(message):
    timestamp = SchemaExecutor.get_timestamp()
    print(f"{Fore.YELLOW}[{timestamp}] ⚠ {message}{Style.RESET_ALL}")

  @staticmethod
  def log_processing(message):
    timestamp = SchemaExecutor.get_timestamp()
    print(f"{Fore.MAGENTA}[{timestamp}] ⚙ {message}{Style.RESET_ALL}")

  def connect(self):
    try:
      self.connection = mysql.connector.connect(
        host=self.config['host'],
        user=self.config['user'],
        password=self.config['password']
      )
      self.cursor = self.connection.cursor()
      return True
    except Error as e:
      self.log_error(f"Ошибка подключения к MySQL: {e}")
      return False

  def close_connection(self):
    if self.cursor:
      self.cursor.close()
    if self.connection and self.connection.is_connected():
      self.connection.close()
      self.log_warning("Соединение с MySQL закрыто")

  def check_database_exists(self):
    self.cursor.execute(f"SHOW DATABASES LIKE '{self.config['database']}'")
    return bool(self.cursor.fetchone())

  def get_existing_tables(self):
    self.cursor.execute(f"USE {self.config['database']}")
    self.cursor.execute("SHOW TABLES")
    return [table[0] for table in self.cursor.fetchall()]

  def drop_database(self):
    self.cursor.execute(f"DROP DATABASE IF EXISTS {self.config['database']}")
    self.connection.commit()

  def create_database(self):
    self.cursor.execute(f"CREATE DATABASE {self.config['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    self.connection.commit()

  def confirm_execution(self):
    if self.no_confirm:
      return True
    
    db_exists = self.check_database_exists()
    if db_exists:
      tables = self.get_existing_tables()
      if tables:
        self.log_warning(f"База данных '{self.config['database']}' уже существует и содержит следующие таблицы:")
        for table in tables:
          print(f"{Fore.YELLOW}  - {table}{Style.RESET_ALL}")
      else:
        self.log_warning(f"База данных '{self.config['database']}' существует, но пуста")
    
    print(f"\n{Back.RED}{Fore.WHITE} ⚠ ВНИМАНИЕ! ⚠ {Style.RESET_ALL}")
    self.log_warning("Все существующие таблицы и данные будут удалены!")
    confirmation = input(f"{Fore.YELLOW}Вы уверены, что хотите продолжить? (да/нет): {Style.RESET_ALL}").lower()
    return confirmation in ['да', 'yes', 'y', 'д']

  @staticmethod
  def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower()
        for text in re.split('([0-9]+)', s)]

  def execute_schemas(self):
    try:
      if not self.connect():
        return False

      if not self.confirm_execution():
        self.log_warning("Операция отменена пользователем")
        return False

      self.drop_database()
      self.create_database()
      self.cursor.execute(f"USE {self.config['database']}")
      
      self.log_success(f"База данных '{self.config['database']}' создана заново")
      
      sql_files = [f for f in os.listdir(self.schema_dir) if f.endswith('.sql') and f[0].isdigit()]
      sql_files.sort(key=self.natural_sort_key)
      
      total_files = len(sql_files)
      self.log_info(f"Найдено SQL файлов: {total_files}")
      
      for index, sql_file in enumerate(sql_files, 1):
        self.log_processing(f"Обработка файла ({index}/{total_files}): {sql_file}")
        file_path = os.path.join(self.schema_dir, sql_file)
        
        try:
          with open(file_path, 'r', encoding='utf-8') as file:
            sql_script = file.read()
          
          statements = [stmt.strip() for stmt in sql_script.split(';') if stmt.strip()]
          
          self.log_info(f"Выполнение {len(statements)} SQL-запросов из файла {sql_file}")
          
          for statement in statements:
            self.cursor.execute(statement)
          
          self.connection.commit()
          self.log_success(f"Файл {sql_file} успешно выполнен ✨")
          
        except Error as e:
          self.log_error(f"Ошибка при выполнении файла {sql_file}: {e}")
          raise
        
      return True
        
    except Error as e:
      self.log_error(f"Ошибка выполнения: {e}")
      return False
      
    finally:
      self.close_connection()

if __name__ == "__main__":
  loaded_vars = DotEnv.load()
  parser = argparse.ArgumentParser(description='MySQL Schema Executor')
  parser.add_argument('--no-confirm', action='store_true', help='Execute schemas without confirmation')
  parser.add_argument('--wait-for-sec', type=int, help='Wait for specified seconds before executing schemas')
  args = parser.parse_args()

  print(f"{Back.BLUE}{Fore.WHITE}{'='*50}{Style.RESET_ALL}")
  print(f"{Back.BLUE}{Fore.WHITE} MySQL Schema Executor {Style.RESET_ALL}")
  print(f"{Back.BLUE}{Fore.WHITE}{'='*50}{Style.RESET_ALL}")

  if args.wait_for_sec:
    print(f"{Fore.YELLOW}Ожидание {args.wait_for_sec} секунд перед выполнением схем...{Style.RESET_ALL}")
    time.sleep(args.wait_for_sec)

  DB_CONFIG = {
    'host': DotEnv.get('DB_HOST', 'localhost'),
    'user': DotEnv.get('DB_USER', 'beacon'),
    'password': DotEnv.get('DB_PASSWORD', 'Beacon123!'),
    'database': DotEnv.get('DB_NAME', 'beacon')
  }
  SCHEMA_DIR = 'schemas'
  
  executor = SchemaExecutor(DB_CONFIG, SCHEMA_DIR)
  executor.no_confirm = args.no_confirm
  success = executor.execute_schemas()
  
  print(f"\n{Back.BLUE}{Fore.WHITE}{'='*50}{Style.RESET_ALL}")
  
  sys.exit(0 if success else 1)