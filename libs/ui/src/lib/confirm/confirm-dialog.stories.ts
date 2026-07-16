import { Meta, StoryObj } from '@storybook/angular';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirmdialog.component';

const meta: Meta<ConfirmDialogComponent> = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialogComponent,
  argTypes: {
    isOpen: { control: 'boolean' }
  }
};

export default meta;
type Story = StoryObj<ConfirmDialogComponent>;

export const BasicConfirmation: Story = {
  args: {
    isOpen: true,
    data: {
      title: 'Delete Repository',
      message: 'Are you sure you want to permanently delete this repository? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Keep it'
    }
  }
};

export const AdvancedWithHelp: Story = {
  args: {
    isOpen: true,
    data: {
      title: 'Overwrite Local Database',
      message: 'Your current local database files are out of sync with your cloud origin. Importing will overwrite all unsaved modifications.',
      confirmText: 'Overwrite All',
      cancelText: 'Cancel Sync',
      helpTitle: 'Resolving Divergence',
      helpLines: [
        '<strong>Strategy:</strong> Local changes will be backed up into a temporary branch prior to substitution.',
        'You can retrieve cached assets in your AppData directory if a roll-back becomes necessary.'
      ]
    }
  }
};