# -*- mode: python -*-

block_cipher = None

def get_crypto_path():
    '''Auto import sometimes fails on linux'''
    import Crypto
    crypto_path = Crypto.__path__[0]
    return crypto_path

a = Analysis(['run.py'],
             pathex=['/opt/dmc/storagegrid_dmc'],
             binaries=[],
             datas=[('static', 'static'), ('templates', 'templates'), ('dmc.version', '.'), ('LICENSE', '.')],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)

#Add to the tree the pyCrypto folder
dict_tree = Tree(get_crypto_path(), prefix='Crypto', excludes=["*.pyc"])
a.datas += dict_tree

pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          name='dmc_unix',
          debug=False,
          strip=False,
          upx=True,
          console=True )
