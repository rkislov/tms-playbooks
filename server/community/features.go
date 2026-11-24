// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.
// This is the feature policy of the Tayga fork, not a Mattermost license.
package community

// Features exposes the functionality shipped by this open-source distribution.
// Resource permissions are enforced independently by PermissionsService and the
// host APIs. No license object, server developer flag, or paid SDK is consulted.
type Features struct{}

func (Features) PlaybookAllowed(bool) bool         { return true }
func (Features) RetrospectiveAllowed() bool        { return true }
func (Features) TimelineAllowed() bool             { return true }
func (Features) StatsAllowed() bool                { return true }
func (Features) ChecklistItemDueDateAllowed() bool { return true }
func (Features) PlaybookAttributesAllowed() bool   { return true }
func (Features) ConditionalPlaybooksAllowed() bool { return true }
