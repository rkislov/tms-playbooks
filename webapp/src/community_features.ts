// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.
import {GlobalState} from '@mattermost/types/store';

// Availability in this distribution is independent of Mattermost subscriptions.
// Visibility never replaces the server's per-resource authorization checks.
export const hasCommunityFeatures = (_state: GlobalState): boolean => true;
