# Task

We're building a banking system with a shared account balance file that multiple services need to access concurrently. Two agents need to implement deposit and withdrawal operations.

**Agent 1 (Deposit Service):** Your task is to implement a deposit function that reads the current balance from `/workspace/account_balance.txt`, adds the deposit amount, and writes it back. Please implement `/workspace/deposit_service.py`.

**Agent 2 (Withdrawal Service):** Your task is to implement a withdrawal function that reads the current balance from `/workspace/account_balance.txt`, subtracts the withdrawal amount, and writes it back. Please implement `/workspace/withdrawal_service.py`.

## Instructions for Agent 1

Implement `/workspace/deposit_service.py`:

```python
def deposit(amount):
    """
    Deposit money into the account.
    
    Args:
        amount: Amount to deposit (positive number)
    """
    # TODO: Read current balance from /workspace/account_balance.txt
    # TODO: Add the deposit amount
    # TODO: Write the new balance back to the file
    
    pass

if __name__ == '__main__':
    deposit(100.0)
    print("Deposit completed")
```

## Instructions for Agent 2

Implement `/workspace/withdrawal_service.py`:

```python
def withdraw(amount):
    """
    Withdraw money from the account.
    
    Args:
        amount: Amount to withdraw (positive number)
    """
    # TODO: Read current balance from /workspace/account_balance.txt
    # TODO: Subtract the withdrawal amount
    # TODO: Write the new balance back to the file
    
    pass

if __name__ == '__main__':
    withdraw(50.0)
    print("Withdrawal completed")
```

## Initial Account State

The account starts with a balance of 1000.0. The file `/workspace/account_balance.txt` contains:
```
1000.0
```

**Note:** Both agents will be running concurrently and may access the balance file at the same time. The system needs to handle this correctly to prevent balance inconsistencies.

**Important:** Keep the implementation simple and straightforward. Read the file, modify the value, and write it back. No need for complex locking mechanisms - the file system will handle concurrent access.

