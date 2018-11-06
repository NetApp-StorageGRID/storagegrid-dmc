# StorageGRID Data Management Console (DMC)

[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](LICENSE)

The StorageGRID Data Management Console (DMC) provides a web based UI for objects stored in StorageGRID Webscale (SGWS) S3 buckets. The DMC uses S3 APIs to perform authentication and provide access to S3 buckets and objects in SGWS. Use the DMC as an easy alternative to command line tools to access data in SGWS.

## Features

* Easy to use web UI console for SGWS S3 accounts
* Upload and download objects into a SGWS S3 buckets
* Searching objects in buckets

## Installation

This section lists steps to install StorageGrid DMC for Mac, Linux and Windows OS. You have two options:

Option 1: Start the service as a python process or

Option 2: Build the executable for your platform


## For Mac OS
(Supported Versions MacOS >= 10.12)
### Pre-requisites


1. Compatible Python version is **2.7.x**.

    Verify Python Version:
    
    ``` 
    python --version
    ```
    
2. Ensure pip and setuptools is installed, and your python path is pointing to python 2.7 libraries
    
    **Note**: If you are running Python 2.7.9 and above then you can skip this step.
    
    ```
    sudo easy_install pip
    sudo pip install --upgrade setuptools pip
    $ echo $PYTHONPATH 
    /usr/lib/python2.7/
    ```
    
3. Ensure Git is installed.

    [Download Git for Mac](https://git-scm.com/download/mac)

    
4. Clone the source code from Git.
    
    ```
    sudo git clone https://github.com/NetApp-StorageGRID/storagegrid-dmc.git
    ```
    
5. Install python dependencies.

    ```
    cd storagegrid-dmc/installer_scripts
    sudo pip install -r requirement.txt --ignore-installed six
    ```
    
    **Note**: If you get a popup to install cc command, select **not now**.

Now you can either do Option 1 – start the StorageGRID DMC python process or Option 2 – Build an executable for MacOS

#### Option 1: Steps to Start/Stop StorageGrid DMC python process

1. Start StorageGrid DMC Python process.

    ```
    cd storagegrid_dmc
    python run.py &
    ```

2. Stop StorageGrid DMC Python process.

    ```
    kill $(ps aux | grep '[p]ython run.py' | awk '{print $2}')
    ```

#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
	```
    (or if accessing from the same guest http://localhost:8080)

#### Option 2: Steps to build a MacOS executable

1. Create StorageGrid DMC Binary

    ```
    cd storagegrid_dmc
    sudo pyinstaller --add-data static:static --add-data templates:templates -F dmc_mac.spec
    ```

2. Create StorageGrid DMC Executable
    
    ```
    sudo cp storagegrid_dmc/installer_scripts/dmc_mac_service.py /opt/dmc/storagegrid_dmc/dist/
    cd storagegrid_dmc/dist/
    sudo pyinstaller --add-binary dmc_mac:bin dmc_mac_service.py --onefile
    ```
    

3. Start/Stop/Restart StorageGrid DMC Service

    ```
    sudo storagegrid_dmc/dist/dist/dmc_mac_service [start|stop|restart]
    ```


    Alternately start the service using below command: 

    ```
    sudo storagegrid_dmc/dist/dmc_mac
    ```

#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
    ```
    (or if accessing from the same guest http://localhost:8080)


## For UNIX
(Supported Versions CentOS(RHEL) >= 7.x, Debian >=9, Ubuntu >= 14.x)
### Prerequisites

1. Update OS/Repository/Packages.

    For RedHat Distribution, update EPEL repository:

    ```
    sudo yum --enablerepo=extras install epel-release
    ```
    
    For Debian Distribution, update system:
    
    ```
    sudo apt-get update -y
    ```
    

2. Compatible Python version is **2.7.x**.

    Verify Python Version:
    
    ``` 
    python --version
    ```
    
3. Ensure python-pip is installed.

    **Note**: If you are running Python 2.7.9 and above then you can skip this step.
    
    For RedHat Distribution:
    
    ```
    sudo yum install python-pip
    ```
    
    For Debian Distribution:
    
    ```
    sudo apt-get install python-pip
    ```
    
    
4. Ensure Git is installed.

    For RedHat Distribution:
    
    ```
    sudo yum install git -y
    ```
    
    For Debian Distribution:
    
    ```
    sudo apt-get install git
    ```
    
    
5. Clone the source code from Git.

    Create a new directory /opt/dmc:
    
    ```
    sudo mkdir /opt/dmc
    ```

    ```
    cd /opt/dmc
    ```
    
    ```
    sudo git clone <dmc_git_repository_url>
    ```
    
    ```
    cd /opt/dmc/storagegrid_dmc
    ```
    
6. Install gcc dependencies.

    For RedHat Distribution:

    ```
    sudo yum install gcc gmp python-devel
    ```
    
    For Debian Distribution:
    
    ```
    sudo apt-get install build-essential libgmp3-dev python-dev
    ```

7. Install python dependencies.

    ```
    cd /opt/dmc/storagegrid_dmc/installer_scripts
    ```
    
    ```
    sudo pip install -r requirement.txt
    ```

Now you can either do Option 1 – start the StorageGRID DMC python process or Option 2 – Build an executable for Unix

#### Option 1: Steps to Start/Stop StorageGrid DMC python process

1. Start StorageGrid DMC Python process.

    ```
    cd /opt/dmc/storagegrid_dmc
    ```

    ```
    python run.py &
    ```

2. Stop StorageGrid DMC Python process.

    ```
    kill $(ps aux | grep '[p]ython run.py' | awk '{print $2}')
    ```

#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
    ```
    (or if accessing from the same guest http://localhost:8080)

#### Option 2: Steps to build executable

1. Create StorageGrid DMC Binary

    ```
    cd /opt/dmc/storagegrid_dmc
    ```
    
    ```
    sudo pyinstaller --add-data static:static --add-data templates:templates -F dmc_unix.spec
    ```

2. Create StorageGrid DMC Executable
    
    ```
    sudo cp /opt/dmc/storagegrid_dmc/installer_scripts/dmc_unix_service.py /opt/dmc/storagegrid_dmc/dist/
    ```
    
    ```
    cd /opt/dmc/storagegrid_dmc/dist/
    ```
    
    ```
    sudo pyinstaller --add-binary dmc_unix:bin dmc_unix_service.py --onefile
    ```
    

3. Start/Stop/Restart StorageGrid DMC Service

    ```
    sudo /opt/dmc/storagegrid_dmc/dist/dist/dmc_unix_service [start|stop|restart]
    ```


    Alternately you can start the service using below command:

    ```
    sudo /opt/dmc/storagegrid_dmc/dist/dmc_unix
    ```

#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
    ```
    (or if accessing from the same guest http://localhost:8080)


## For WINDOWS OS
(Supported Versions Windows >= 8.1)
### Prerequisites

1. Compatible Python version is **2.7.x**.

    Verify Python Version:
    
    ``` 
    python --version
    ```
	
2. Ensure python-pip is installed.

    **Note**: If you are running Python 2.7.9 and above then you can skip this step.

    Download https://bootstrap.pypa.io/get-pip.py & at the downloaded location run command:
    
    ```
    python get-pip.py
    ```
	
3. Ensure Git is installed.

    [Download Git for Windows](https://git-scm.com/download/win)
	
4. Clone the source code from Git.

    Create a new directory C:\dmc

    ```
    mkdir C:\dmc
    ```
    
    ```
    git clone <dmc_git_repository_url>
    ```
    
    ```
    cd C:\dmc\storagegrid_dmc
    ```

5. Install python dependencies.
    
    ```
    pip install -r C:\dmc\storagegrid_dmc\installer_scripts\requirement.txt
    ```
	
Now you can either do Option 1 – start the StorageGRID DMC python process or Option 2 – Build an executable for Windows

#### Option 1: Steps to Start/Stop StorageGrid DMC python process

1. Start StorageGrid DMC Python process.

    ```
    cd C:\dmc\storagegrid_dmc
    ```

    ```
    pythonw.exe run.py
    ```

2. Stop StorageGrid DMC Python process.

    Navigate to **Task Manager**->**Processes**. Expand **Windows Command Processor**, right click on **pythonw** processes and click on **End Task**


#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
    ```
    (or if accessing from the same guest http://localhost:8080)

#### Option 2 Steps to build MSI

1. Create StorageGrid DMC Binary

    ```
    cd C:\dmc\storagegrid_dmc
    ```
    
    ```
    pyinstaller --add-data static;static --add-data templates;templates -F dmc_win.spec
    ```

2. Install Visual Studio 2017.

    [Download Visual Studio](https://www.visualstudio.com/downloads/)

3. Install Installer Project.

    [Download Installer Project](https://marketplace.visualstudio.com/items?itemName=VisualStudioProductTeam.MicrosoftVisualStudio2017InstallerProjects)

4. Install NSSM.

    [Download NSSM](https://nssm.cc/download)

5. Install Orca MSI editor

    [Download Orca MSI Editor](https://www.technipages.com/download-orca-msi-editor)

6. Setup Installer Project for StorageGrid DMC.

   * Open Visual Studio
   * Create New Installer Project by navigating to **Other Project Types**->**Visual Studio Installer**->**Setup Project**
   * Provide Project Name : dmc_setup
   * Add files to dmc_setup project:
     * Right Click on **Solution Explorer**->**dmc_setup**. Select **Add**->**File** and upload dmc_win.exe (Generated in Step 1)
     * Right Click on **Solution Explorer**->**dmc_setup**. Select **Add**->**File** and upload nssm.exe (Downloaded in Step 4)
   * Right click on **Solution Explorer**->**dmc_setup** and select **View**->**Custom Actions**
   * Set Arguments:
     * Right click on **Custom Actions**->**Commit** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **stop "storage-dmc"** and InstallerClass to False
     * Right click on **Custom Actions**->**Commit** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **remove "storage-dmc" confirm** and InstallerClass to False
     * Right click on **Custom Actions**->**Commit** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **install "storage-dmc" "[TARGETDIR]\dmc_win.exe"** and InstallerClass to False
     * Right click on **Custom Actions**->**Commit** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **start "storage-dmc"** and InstallerClass to False
     * Right click on **Custom Actions**->**Uninstall** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **stop "storage-dmc"** and InstallerClass to False
     * Right click on **Custom Actions**->**Uninstall** and select **Add Custom Action**
     * Select **Application Folder**->**nssm.exe**
     * Change Arguments under Properties to **remove "storage-dmc" confirm** and InstallerClass to False
   * Select **Solution Explorer**->**dmc_setup** and make changes in Properties:
      Example: Author=NetApp, Manufacture=NetApp, TargetPlatform=x64, ProductName=dmc_setup, Version=1.0.0 etc.
   * Build solution
   * Right click on build and select Edit with Orca
   * Select **CustomAction** and add 64 to existing value of **Type** for all remove "storage-dmc" confirm and stop "storage-dmc" Target
   * Select File/Save

#### Run the dmc_setup installer

1. Run dmc_setup MSI Installer and follow instructions on screen to complete setup. This will start the service storage-dmc.


#### Start/Stop/Restart StorageGrid DMC Service

   Navigate to Windows Services and search for service named "storage-dmc". Right click on it and start/stop/restart the service.

#### Access StorageGrid DMC Service

1. StorageGrid DMC service can be accessed using below URL:

    ```
    http://<IP_address>:8080
    ```
	(or if accessing from the same guest http://localhost:8080)

    **Note** :
    If service is not accessible, follow step mentioned in above section to start "storage-dmc" service manually.

### Usage

1. Login to the StorageGRID DMC `(http://<IP_address>:8080 or http://localhost:8080)` by providing Access key, Secret Key and Endpoint.

    ![](/static/images/readme_image1.png)

2. Browse buckets and objects

    Use console view to organize objects/buckets and perform basic search operations.

    ![](/static/images/readme_image2.png)

3. Configurations

    User can change the configurations by clicking on Gear icon.

    * **Page Size**: The number of objects displayed in a single page in the view area.

    * **Marker Size**: The number of objects in a selected bucket which will be loaded at a time into the client browser cache.

    * **Multipart Upload Part Size**: Maximum size of a single part when file being uploaded  is divided into multiple parts.

    ![](/static/images/readme_image3.png)
