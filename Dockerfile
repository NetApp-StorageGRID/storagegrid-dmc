FROM ubuntu:16.04

RUN apt-get update -y
RUN apt-get install python-pip -y
RUN apt-get install git -y

RUN mkdir /opt/dmc
WORKDIR /opt/dmc

RUN git clone https://github.com/NetApp-StorageGRID/storagegrid-dmc.git
WORKDIR /opt/dmc/storagegrid-dmc
RUN apt-get install build-essential libgmp3-dev python-dev -y
WORKDIR /opt/dmc/storagegrid-dmc/installer_scripts
RUN pip install -r requirement.txt

EXPOSE 8080

WORKDIR /opt/dmc/storagegrid-dmc
CMD python ./run.py
