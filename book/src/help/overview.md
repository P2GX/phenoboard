# Phenoboard Help

Phenoboard offers several ways of curating clinical data. The start page of the app shows these options.



<figure>
  <img src="img/phenoboard-start.png" alt="phenoboard" width="600">
  <figcaption>
    <strong>Phenoboard start page</strong>.
  </figcaption>
</figure>

## ORCID
Before using Phenoboard for the first time, the user needs to enter an [ORCID](https://orcid.org/) research indentifier. Enter just the number (e.g., enter `0000-0002-0736-9199` and not `https://orcid.org/0000-0002-0736-9199`). Phenoboard stores the ORCID in its settings directory (which is automatically created as a hidden directory in the user's home directory upon the first use of the app). From this point on, the ORCID will be automatically loaded upon program start.

## Load the HPO
Before curation, the user needs to load the ``hp.json`` file. We recommend always using the latest version, which can be found in the [Download](https://hpo.jax.org/data/ontology) section of the HPO website. The path to this file is always stored in the settings directory, and the ontology will be loaded automatically upon program start. Users should check if an update is available and if so, download the new ``hp.json`` file and load it in Phenoboard.

## Select phetools (legacy) template file
This option is only of use to the HPO maintainers. The first version of [Phenopacket Store](https://pubmed.ncbi.nlm.nih.gov/39394689/) was developed using a standardized Excel template, which we are currently updating to use the Phenoboard JSON format. Note that the phenopackets generated from both sources are identical. This option will disappear once the HPO maintainers have finished the migration to the new format.

## Select phetools JSON file
This option selects a Pheboard JSON file that is used to store data about a cohort and which Pheboard uses to create a collection of phenopackets representing the cohort. TODO

## Create a new template
TODO

## Open external table
This option is used to add data from an external table (such as the Supplemental Table representing data about a cohort).