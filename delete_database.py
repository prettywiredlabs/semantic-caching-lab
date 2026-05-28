from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError
import sys
from utils import get_connection_string, get_database


def main():
    try:
        connection_string = get_connection_string()
        client = MongoClient(connection_string)

        client.admin.command("ping")
        print("Successfully connected and pinged Azure DocumentDB")

        database = get_database(client)
        client.drop_database(database)
        print(f"Dropped database: {database.name}")
    
    except ConnectionFailure as error:
        print(f"Connection failed: {error}", file=sys.stderr)
        sys.exit(1)
    except PyMongoError as error:
        print(f"Database operation failed: {error}", file=sys.stderr)
        sys.exit(1)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()