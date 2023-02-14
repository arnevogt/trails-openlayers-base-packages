import { Error } from "@open-pioneer/core";
import { ApplicationProperties } from "../CustomElement";
import { ErrorId } from "../errors";
import { PackageMetadata, PropertyMetadata } from "../metadata";
import { parseReferenceSpec, ReferenceSpec } from "./InterfaceSpec";
import { ServiceRepr } from "./ServiceRepr";

export class PackageRepr {
    static create(data: PackageMetadata, customProperties?: Record<string, unknown>): PackageRepr {
        const name = data.name;
        const properties = data.properties ?? {};
        const finalProperties = customizeProperties(name, properties, customProperties);
        const services = Object.entries(data.services ?? {}).map<ServiceRepr>(
            ([name, serviceData]) => {
                if (name !== serviceData.name) {
                    throw new Error(
                        ErrorId.INVALID_METADATA,
                        "Invalid metadata: service name mismatch."
                    );
                }
                return ServiceRepr.create(data.name, serviceData, finalProperties);
            }
        );
        const uiReferences = data.ui?.references?.map((ref) => parseReferenceSpec(ref)) ?? [];
        return new PackageRepr({
            name,
            services,
            uiReferences,
            properties: finalProperties
        });
    }

    /** Package name */
    readonly name: string;

    /** Services defined by the package */
    readonly services: readonly ServiceRepr[];

    /** Interfaces required by UI components. */
    readonly uiReferences: readonly Readonly<ReferenceSpec>[];

    /** Resolved (perhaps customized) package properties. */
    readonly properties: Readonly<Record<string, unknown>>;

    constructor(options: {
        name: string;
        services?: ServiceRepr[];
        uiReferences?: ReferenceSpec[];
        properties?: Record<string, unknown>;
    }) {
        const name = options.name;
        if (!isValidPackageName(name)) {
            throw new Error(ErrorId.INTERNAL, `Invalid package name: '${name}'.`);
        }

        this.name = name;
        this.services = options.services ?? [];
        this.uiReferences = options.uiReferences ?? [];
        this.properties = options?.properties ?? {};
    }
}

export function createPackages(
    packages: Record<string, PackageMetadata>,
    customProperties?: ApplicationProperties
) {
    return Object.entries(packages).map<PackageRepr>(([name, packageMetadata]) => {
        if (name !== packageMetadata.name) {
            throw new Error(ErrorId.INVALID_METADATA, "Invalid metadata: package name mismatch.");
        }

        return PackageRepr.create(packageMetadata, customProperties?.[name]);
    });
}

/**
 * Merges the declared properties of the package with the application-defined
 * custom properties.
 */
function customizeProperties(
    packageName: string,
    properties: Record<string, PropertyMetadata>,
    customProperties: Record<string, unknown> = {}
) {
    const merged: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, propertyMetadata] of Object.entries(properties)) {
        merged[key] = propertyMetadata.value;
        if (propertyMetadata.required) {
            required.push(key);
        }
    }

    for (const [key, value] of Object.entries(customProperties)) {
        if (!hasProperty(merged, key)) {
            throw new Error(
                ErrorId.INVALID_PROPERTY_NAME,
                `Unexpected property name '${key}' for package '${packageName}': the property does not exist.`
            );
        }
        merged[key] = value;
    }

    for (const key of required) {
        const value = merged[key];
        if (value == null) {
            throw new Error(
                ErrorId.REQUIRED_PROPERTY,
                `Package '${packageName}' requires the property '${key}' to be initialized to a non-null value.`
            );
        }
    }

    return merged;
}

const HAS_PROP = Object.prototype.hasOwnProperty;

function hasProperty(object: unknown, key: string) {
    return HAS_PROP.call(object, key);
}

// http://json.schemastore.org/package
const NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function isValidPackageName(name: string): boolean {
    return NAME_REGEX.test(name);
}