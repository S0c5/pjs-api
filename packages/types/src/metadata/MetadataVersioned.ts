// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AnyJson } from '@polkadot/types-codec/types';
import type { HexString } from '@polkadot/util/types';
import type { MetadataAll, MetadataLatest, MetadataV9, MetadataV10, MetadataV11, MetadataV12, MetadataV13, MetadataV14, MetadataV15 } from '../interfaces/metadata/index.js';
import type { Registry } from '../types/index.js';

import { Struct } from '@polkadot/types-codec';

import { getUniqTypes, toCallsOnly } from './util/index.js';
import { toV10 } from './v9/toV10.js';
import { toV11 } from './v10/toV11.js';
import { toV12 } from './v11/toV12.js';
import { toV13 } from './v12/toV13.js';
import { toV14 } from './v13/toV14.js';
import { toV15 } from './v14/toV15.js';
import { toLatest } from './v15/toLatest.js';
import { MagicNumber } from './MagicNumber.js';

// Use these to generate all the Meta* types below via template keys
// NOTE: Keep from latest -> earliest, see the LATEST_VERSION 0 index
const KNOWN_VERSIONS = [15, 14, 13, 12, 11, 10, 9] as const;
const LATEST_VERSION = KNOWN_VERSIONS[0];

// This is part of migration. The toCallsOnly would be usede for esxtensions,
// i.e. they need to be updated. To ensure that they are passed a known version
// we actually set this to a known-working version
//
// NOTE: This would only work on compatible types, i.e. v14 & v15 comply
const TO_CALLS_VERSION = 14; // LATEST_VERSION;

type MetaAll = typeof KNOWN_VERSIONS[number];
type MetaAsX = `asV${MetaAll}`;
type MetaMapped = MetadataAll[MetaAsX];
type MetaVersions = Exclude<MetaAll, 9> | 'latest';

/**
 * @name MetadataVersioned
 * @description
 * The versioned runtime metadata as a decoded structure
 */
export class MetadataVersioned extends Struct {
  readonly #converted = new Map<MetaVersions, MetaMapped>();

  constructor (registry: Registry, value?: Uint8Array | HexString | Map<string, unknown> | Record<string, unknown>) {
    // const timeStart = performance.now()

    super(registry, {
      magicNumber: MagicNumber,
      metadata: 'MetadataAll'
    }, value);

    // console.log('MetadataVersioned', `${(performance.now() - timeStart).toFixed(2)}ms`)
  }

  #assertVersion = (version: number): boolean => {
    if (this.version > version) {
      throw new Error(`Cannot convert metadata from version ${this.version} to ${version}`);
    }

    return this.version === version;
  };

  #getVersion = <T extends MetaMapped, F extends MetaMapped>(version: MetaVersions, fromPrev: (registry: Registry, input: F, metaVersion: number) => T): T => {
    if (version !== 'latest' && this.#assertVersion(version)) {
      const asCurr: MetaAsX = `asV${version}`;

      return this.#metadata()[asCurr] as T;
    }

    if (!this.#converted.has(version)) {
      const asPrev: MetaAsX = version === 'latest'
        ? `asV${LATEST_VERSION}`
        : `asV${(version - 1) as MetaAll}`;

      this.#converted.set(version, fromPrev(this.registry, this[asPrev] as F, this.version));
    }

    return this.#converted.get(version) as T;
  };

  /**
   * @description the metadata wrapped
   */
  #metadata = (): MetadataAll => {
    return this.getT('metadata');
  };

  /**
   * @description Returns the wrapped metadata as a limited calls-only (latest) version
   */
  public get asCallsOnly (): MetadataVersioned {
    return new MetadataVersioned(this.registry, {
      magicNumber: this.magicNumber,
      metadata: this.registry.createTypeUnsafe('MetadataAll', [toCallsOnly(this.registry, this.asLatest), TO_CALLS_VERSION])
    });
  }

  /**
   * @description Returns the wrapped metadata as a V9 object
   */
  public get asV9 (): MetadataV9 {
    this.#assertVersion(9);

    return this.#metadata().asV9;
  }

  /**
   * @description Returns the wrapped values as a V10 object
   */
  public get asV10 (): MetadataV10 {
    return this.#getVersion(10, toV10);
  }

  /**
   * @description Returns the wrapped values as a V11 object
   */
  public get asV11 (): MetadataV11 {
    return this.#getVersion(11, toV11);
  }

  /**
   * @description Returns the wrapped values as a V12 object
   */
  public get asV12 (): MetadataV12 {
    return this.#getVersion(12, toV12);
  }

  /**
   * @description Returns the wrapped values as a V13 object
   */
  public get asV13 (): MetadataV13 {
    return this.#getVersion(13, toV13);
  }

  /**
   * @description Returns the wrapped values as a V14 object
   */
  public get asV14 (): MetadataV14 {
    return this.#getVersion(14, toV14);
  }

  /**
   * @description Returns the wrapped values as a V14 object
   */
  public get asV15 (): MetadataV15 {
    return this.#getVersion(15, toV15);
  }

  /**
   * @description Returns the wrapped values as a latest version object
   */
  public get asLatest (): MetadataLatest {
    return this.#getVersion('latest', toLatest);
  }

  /**
   * @description The magicNumber for the Metadata (known constant)
   */
  public get magicNumber (): MagicNumber {
    return this.getT('magicNumber');
  }

  /**
   * @description the metadata version this structure represents
   */
  public get version (): number {
    return this.#metadata().index;
  }

  public getUniqTypes (throwError: boolean): string[] {
    return getUniqTypes(this.registry, this.asLatest, throwError);
  }

  /**
   * @description Converts the Object to JSON, typically used for RPC transfers
   */
  public override toJSON (): Record<string, AnyJson> {
    // HACK(y): ensure that we apply the aliases if we have not done so already, this is
    // needed to ensure we have the correct overrides (which is only applied in toLatest)
    // eslint-disable-next-line no-unused-expressions
    this.asLatest;

    return super.toJSON();
  }
}
