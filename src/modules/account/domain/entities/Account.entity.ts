export class AccountEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly ownerId: string,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Determina si esta es la cuenta de empleados internos
   */
  isEmployeesAccount(): boolean {
    return this.name === 'Employees';
  }

  /**
   * Actualiza el nombre de la cuenta
   */
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Account name cannot be empty');
    }
    this.name = newName.trim();
    this.updatedAt = new Date();
  }
}
