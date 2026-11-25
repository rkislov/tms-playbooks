// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.

import {IntlShape} from 'react-intl';
import {UserProfile} from '@mattermost/types/users';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {RUN_NAME_MAX_LENGTH} from 'src/constants';

export const playbookIsTutorialPlaybook = (title?: string) => title === 'Learn how to use playbooks' || title === 'Знакомство со сценариями';

export function tutorialRunTitle(formatMessage: IntlShape['formatMessage'], user: UserProfile) {
    return formatMessage({defaultMessage: 'Onboarding run — {name}'}, {name: displayUsername(user, 'full_name')});
}

export function newTutorialRunTitle(formatMessage: IntlShape['formatMessage'], user: UserProfile) {
    const title = tutorialRunTitle(formatMessage, user);
    if (title.length <= RUN_NAME_MAX_LENGTH) {
        return title;
    }
    const shortened = title.slice(0, RUN_NAME_MAX_LENGTH - 1).replace(/[\uD800-\uDBFF]$/, '');
    return shortened.trimEnd() + '…';
}
