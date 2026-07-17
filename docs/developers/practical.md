# Practical tips


## Clearing the Mac cache
Sometimes the spotlight search function will include links to local versions of the phenoboard app when we want to test a version that was downloaded from the Releases page.

In this case, 

1. open the *Activity Monitor* (Applications → Utilities → Activity Monitor).
2. find phenoboard, select it,  and click the “i” (info) button in the toolbar.
3. Go to the “Open Files and Ports” tab.
4. This will reveal the path of the executable that spotlight is finding.
5. Enter ``open -R <path from above>/Phenoboard.app `` to open the folder in which this extecutable is located
6. Delete the executable file