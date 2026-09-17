type ServiceFactory<T = unknown> = () => T;

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, unknown>();
  private factories = new Map<string, ServiceFactory>();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  registerFactory<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory as ServiceFactory);
  }

  resolve<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory() as T;
      this.services.set(name, instance);
      return instance;
    }
    throw new Error(`ServiceRegistry: Service '${name}' not found.`);
  }

  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
